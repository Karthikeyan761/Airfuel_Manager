"""
Reports Blueprint
PDF generation for fuel cost reports, monthly summaries, and aircraft consumption.
"""
from io import BytesIO
from datetime import date, datetime
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required
from sqlalchemy import func, desc
from extensions import db
from models import Flight, FuelPurchase, Aircraft, DailyFuelUsage, FuelTransaction

reports_bp = Blueprint('reports', __name__)


def _get_date_filters(request):
    start = request.args.get('start_date')
    end = request.args.get('end_date')
    if not start:
        start = date.today().replace(day=1).isoformat()
    if not end:
        end = date.today().isoformat()
    return start, end


@reports_bp.route('/trip-costs', methods=['GET'])
@jwt_required()
def trip_costs_report():
    """Per-trip fuel cost report with filters."""
    start, end = _get_date_filters(request)
    aircraft_id = request.args.get('aircraft_id')

    query = Flight.query.filter(
        Flight.status == 'completed',
        Flight.flight_date >= start,
        Flight.flight_date <= end
    )
    if aircraft_id:
        query = query.filter_by(aircraft_id_fk=int(aircraft_id))

    flights = query.order_by(Flight.flight_date).all()

    data = []
    for f in flights:
        data.append({
            'flight_number': f.flight_number,
            'flight_date': f.flight_date.isoformat(),
            'route': f'{f.source} → {f.destination}',
            'aircraft': f.aircraft.aircraft_id if f.aircraft else 'N/A',
            'distance_km': f.distance_km,
            'required_fuel': f.required_fuel_liters,
            'actual_fuel': f.actual_fuel_used_liters,
            'efficiency': f.fuel_efficiency,
            'price_per_liter': f.fuel_price_at_time,
            'trip_fuel_cost': f.trip_fuel_cost,
        })

    total_cost = sum(d['trip_fuel_cost'] or 0 for d in data)
    total_fuel = sum(d['actual_fuel'] or 0 for d in data)

    return jsonify({
        'report_type': 'trip_costs',
        'period': {'start': start, 'end': end},
        'trips': data,
        'summary': {
            'total_trips': len(data),
            'total_fuel_used': round(total_fuel, 2),
            'total_fuel_cost': round(total_cost, 2),
            'avg_cost_per_trip': round(total_cost / len(data), 2) if data else 0
        }
    }), 200


@reports_bp.route('/monthly-usage', methods=['GET'])
@jwt_required()
def monthly_usage_report():
    """Monthly fuel usage aggregated by month."""
    from sqlalchemy import extract

    result = db.session.query(
        extract('year', DailyFuelUsage.usage_date).label('year'),
        extract('month', DailyFuelUsage.usage_date).label('month'),
        func.sum(DailyFuelUsage.total_fuel_used_liters).label('total_fuel'),
        func.sum(DailyFuelUsage.total_flights).label('total_flights'),
        func.sum(DailyFuelUsage.total_fuel_cost).label('total_cost'),
        func.sum(DailyFuelUsage.jet_a1_used).label('jet_a1_used'),
        func.sum(DailyFuelUsage.avgas_used).label('avgas_used')
    ).group_by('year', 'month').order_by('year', 'month').all()

    months = []
    month_names = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    for r in result:
        months.append({
            'year': int(r.year),
            'month': int(r.month),
            'month_name': f"{month_names[int(r.month)]} {int(r.year)}",
            'total_fuel_used': round(r.total_fuel or 0, 2),
            'total_flights': r.total_flights or 0,
            'total_cost': round(r.total_cost or 0, 2),
            'jet_a1_used': round(r.jet_a1_used or 0, 2),
            'avgas_used': round(r.avgas_used or 0, 2)
        })

    return jsonify({
        'report_type': 'monthly_usage',
        'data': months
    }), 200


@reports_bp.route('/aircraft-consumption', methods=['GET'])
@jwt_required()
def aircraft_consumption_report():
    """Aircraft-wise fuel consumption comparison report."""
    start, end = _get_date_filters(request)

    result = db.session.query(
        Aircraft.aircraft_id,
        Aircraft.model,
        func.count(Flight.id).label('total_flights'),
        func.sum(Flight.actual_fuel_used_liters).label('total_fuel_used'),
        func.sum(Flight.required_fuel_liters).label('total_required_fuel'),
        func.sum(Flight.trip_fuel_cost).label('total_cost'),
        func.sum(Flight.distance_km).label('total_distance'),
        func.avg(Flight.fuel_efficiency).label('avg_efficiency')
    ).join(Flight, Flight.aircraft_id_fk == Aircraft.id
    ).filter(
        Flight.status == 'completed',
        Flight.flight_date >= start,
        Flight.flight_date <= end
    ).group_by(Aircraft.aircraft_id, Aircraft.model).all()

    data = []
    for r in result:
        data.append({
            'aircraft_id': r.aircraft_id,
            'model': r.model,
            'total_flights': r.total_flights or 0,
            'total_fuel_used_liters': round(r.total_fuel_used or 0, 2),
            'total_required_fuel_liters': round(r.total_required_fuel or 0, 2),
            'total_fuel_cost': round(r.total_cost or 0, 2),
            'total_distance_km': round(r.total_distance or 0, 2),
            'avg_efficiency': round(r.avg_efficiency or 1.0, 4)
        })

    return jsonify({
        'report_type': 'aircraft_consumption',
        'period': {'start': start, 'end': end},
        'data': data
    }), 200


@reports_bp.route('/export-pdf', methods=['GET'])
@jwt_required()
def export_pdf():
    """
    Generate and return a PDF report.
    Query param: report_type (trip_costs | monthly_usage | aircraft_consumption)
    """
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.platypus import (SimpleDocTemplate, Table, TableStyle,
                                     Paragraph, Spacer)
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

    report_type = request.args.get('report_type', 'trip_costs')
    start, end = _get_date_filters(request)

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4),
                            rightMargin=1.5*cm, leftMargin=1.5*cm,
                            topMargin=2*cm, bottomMargin=2*cm)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'],
                                  fontSize=18, spaceAfter=6,
                                  textColor=colors.HexColor('#1a1a2e'))
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'],
                                     fontSize=10, spaceAfter=12,
                                     textColor=colors.grey)

    elements = []
    title_map = {
        'trip_costs': 'Fuel Cost Per Trip Report',
        'monthly_usage': 'Monthly Fuel Usage Report',
        'aircraft_consumption': 'Aircraft-Wise Fuel Consumption Report'
    }

    elements.append(Paragraph('✈ Aircraft Fuel Management System', title_style))
    elements.append(Paragraph(f'{title_map.get(report_type, "Report")} | Period: {start} to {end}', subtitle_style))
    elements.append(Paragraph(f'Generated: {datetime.now().strftime("%Y-%m-%d %H:%M")}', subtitle_style))
    elements.append(Spacer(1, 0.5*cm))

    header_style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a2e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f0f4ff')]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ])

    if report_type == 'trip_costs':
        flights = Flight.query.filter(
            Flight.status == 'completed',
            Flight.flight_date >= start,
            Flight.flight_date <= end
        ).order_by(Flight.flight_date).all()

        table_data = [['Flight #', 'Date', 'Route', 'Aircraft', 'Distance (km)',
                        'Fuel Used (L)', 'Price/L (₹)', 'Trip Cost (₹)']]
        for f in flights:
            table_data.append([
                f.flight_number,
                f.flight_date.isoformat(),
                f'{f.source} → {f.destination}',
                f.aircraft.aircraft_id if f.aircraft else 'N/A',
                f'{f.distance_km:,.0f}',
                f'{f.actual_fuel_used_liters:,.1f}' if f.actual_fuel_used_liters else '-',
                f'₹{f.fuel_price_at_time:.2f}' if f.fuel_price_at_time else '-',
                f'₹{f.trip_fuel_cost:,.2f}' if f.trip_fuel_cost else '-'
            ])

        if len(table_data) > 1:
            tbl = Table(table_data, colWidths=[2.5*cm, 2.5*cm, 6*cm, 2.5*cm, 3*cm, 3*cm, 3*cm, 4*cm])
            tbl.setStyle(header_style)
            elements.append(tbl)
        else:
            elements.append(Paragraph('No completed flights in selected period.', styles['Normal']))

    elif report_type == 'monthly_usage':
        records = DailyFuelUsage.query.order_by(DailyFuelUsage.usage_date).all()
        month_map = {}
        for r in records:
            key = r.usage_date.strftime('%b %Y')
            if key not in month_map:
                month_map[key] = {'fuel': 0, 'flights': 0, 'cost': 0}
            month_map[key]['fuel'] += r.total_fuel_used_liters
            month_map[key]['flights'] += r.total_flights
            month_map[key]['cost'] += r.total_fuel_cost

        table_data = [['Month', 'Total Fuel Used (L)', 'Total Flights', 'Total Cost (₹)']]
        for month, vals in month_map.items():
            table_data.append([
                month,
                f"{vals['fuel']:,.1f}",
                str(vals['flights']),
                f"₹{vals['cost']:,.2f}"
            ])

        tbl = Table(table_data, colWidths=[4*cm, 6*cm, 5*cm, 6*cm])
        tbl.setStyle(header_style)
        elements.append(tbl)

    elif report_type == 'aircraft_consumption':
        aircraft_list = Aircraft.query.all()
        table_data = [['Aircraft ID', 'Model', 'Total Flights', 'Fuel Used (L)', 'Distance (km)', 'Total Cost (₹)', 'Avg Efficiency']]

        for aircraft in aircraft_list:
            flights = Flight.query.filter_by(aircraft_id_fk=aircraft.id, status='completed').all()
            total_fuel = sum(f.actual_fuel_used_liters or 0 for f in flights)
            total_distance = sum(f.distance_km for f in flights)
            total_cost = sum(f.trip_fuel_cost or 0 for f in flights)
            avg_eff = sum(f.fuel_efficiency or 1.0 for f in flights) / len(flights) if flights else 0

            table_data.append([
                aircraft.aircraft_id,
                aircraft.model,
                str(len(flights)),
                f'{total_fuel:,.1f}',
                f'{total_distance:,.0f}',
                f'₹{total_cost:,.2f}',
                f'{avg_eff:.4f}'
            ])

        tbl = Table(table_data, colWidths=[2.5*cm, 5*cm, 3*cm, 3.5*cm, 3.5*cm, 4*cm, 3.5*cm])
        tbl.setStyle(header_style)
        elements.append(tbl)

    doc.build(elements)
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name=f'{report_type}_{start}_{end}.pdf',
        mimetype='application/pdf'
    )
