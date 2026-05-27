"""
PDF Test Report Generator — Aircraft Fuel Cost & Trip Management System
Generates a professional provisional automated test report using ReportLab.
"""

import os
import sys
from datetime import datetime

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import mm, cm
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
    from reportlab.platypus import (
        SimpleDocTemplate, Table, TableStyle, Paragraph,
        Spacer, HRFlowable, PageBreak, KeepTogether
    )
    from reportlab.platypus.flowables import Flowable
    from reportlab.graphics.shapes import Drawing, Rect, String, Line, Circle
    from reportlab.graphics.charts.barcharts import VerticalBarChart
    from reportlab.graphics.charts.piecharts import Pie
    from reportlab.graphics import renderPDF
except ImportError:
    print("ReportLab not found. Install with: pip install reportlab")
    sys.exit(1)


# ─────────────────────────────────────────────────────────
# Color Palette
# ─────────────────────────────────────────────────────────
NAVY       = colors.HexColor('#0D1B2A')
DARK_BLUE  = colors.HexColor('#1B3A5C')
SKY_BLUE   = colors.HexColor('#2B7FBF')
ACCENT     = colors.HexColor('#00A8E8')
LIGHT_BLUE = colors.HexColor('#D6EAF8')
PASS_GREEN = colors.HexColor('#1B8A4A')
PASS_BG    = colors.HexColor('#D6F5E3')
FAIL_RED   = colors.HexColor('#C0392B')
FAIL_BG    = colors.HexColor('#FADBD8')
ERROR_ORG  = colors.HexColor('#D35400')
ERROR_BG   = colors.HexColor('#FAE5D3')
SKIP_GRAY  = colors.HexColor('#7F8C8D')
GOLD       = colors.HexColor('#F0A500')
WHITE      = colors.white
LIGHT_GRAY = colors.HexColor('#F4F6F7')
MID_GRAY   = colors.HexColor('#BDC3C7')
DARK_GRAY  = colors.HexColor('#2C3E50')

PAGE_W, PAGE_H = A4


# ─────────────────────────────────────────────────────────
# Custom Flowables
# ─────────────────────────────────────────────────────────
class HorizontalRule(Flowable):
    def __init__(self, width, thickness=0.5, color=MID_GRAY):
        Flowable.__init__(self)
        self.width = width
        self.thickness = thickness
        self.color = color

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.thickness)
        self.canv.line(0, 0, self.width, 0)

    def wrap(self, *args):
        return self.width, self.thickness + 2


class SummaryCard(Flowable):
    """Colored KPI card with label and value."""
    def __init__(self, label, value, bg_color, text_color=WHITE, width=105, height=55):
        Flowable.__init__(self)
        self.label = label
        self.value = str(value)
        self.bg_color = bg_color
        self.text_color = text_color
        self.width = width
        self.height = height

    def wrap(self, *args):
        return self.width, self.height

    def draw(self):
        c = self.canv
        # Card background with rounded corners simulation
        c.setFillColor(self.bg_color)
        c.setStrokeColor(self.bg_color)
        c.roundRect(0, 0, self.width, self.height, 6, fill=1, stroke=0)
        # Value text
        c.setFillColor(self.text_color)
        c.setFont('Helvetica-Bold', 22)
        c.drawCentredString(self.width / 2, self.height / 2 + 4, self.value)
        # Label text
        c.setFont('Helvetica', 8)
        c.setFillColor(self.text_color)
        c.drawCentredString(self.width / 2, self.height / 2 - 14, self.label)


class StatusBadge(Flowable):
    """Inline colored badge for PASS/FAIL/ERROR/SKIP."""
    STATUS_COLORS = {
        'PASS':  (PASS_GREEN, PASS_BG),
        'FAIL':  (FAIL_RED,   FAIL_BG),
        'ERROR': (ERROR_ORG,  ERROR_BG),
        'SKIP':  (SKIP_GRAY,  LIGHT_GRAY),
    }

    def __init__(self, status, width=44, height=14):
        Flowable.__init__(self)
        self.status = status
        self.width = width
        self.height = height

    def wrap(self, *args):
        return self.width, self.height

    def draw(self):
        text_c, bg_c = self.STATUS_COLORS.get(self.status, (DARK_GRAY, LIGHT_GRAY))
        c = self.canv
        c.setFillColor(bg_c)
        c.roundRect(0, 0, self.width, self.height, 4, fill=1, stroke=0)
        c.setFillColor(text_c)
        c.setFont('Helvetica-Bold', 7.5)
        c.drawCentredString(self.width / 2, 3.5, self.status)


# ─────────────────────────────────────────────────────────
# Style Registry
# ─────────────────────────────────────────────────────────
def build_styles():
    base = getSampleStyleSheet()

    styles = {
        'title': ParagraphStyle('title',
            fontName='Helvetica-Bold', fontSize=22, textColor=WHITE,
            alignment=TA_CENTER, spaceAfter=4),

        'subtitle': ParagraphStyle('subtitle',
            fontName='Helvetica', fontSize=10, textColor=colors.HexColor('#A9CCE3'),
            alignment=TA_CENTER, spaceAfter=2),

        'provisional': ParagraphStyle('provisional',
            fontName='Helvetica-Bold', fontSize=8.5,
            textColor=GOLD, alignment=TA_CENTER, spaceAfter=4),

        'section_hdr': ParagraphStyle('section_hdr',
            fontName='Helvetica-Bold', fontSize=13, textColor=DARK_BLUE,
            spaceBefore=12, spaceAfter=6),

        'module_hdr': ParagraphStyle('module_hdr',
            fontName='Helvetica-Bold', fontSize=10, textColor=WHITE,
            spaceBefore=8, spaceAfter=4, leftIndent=0),

        'body': ParagraphStyle('body',
            fontName='Helvetica', fontSize=8.5, textColor=DARK_GRAY,
            leading=13, spaceAfter=3),

        'body_bold': ParagraphStyle('body_bold',
            fontName='Helvetica-Bold', fontSize=8.5, textColor=DARK_GRAY,
            leading=13, spaceAfter=3),

        'caption': ParagraphStyle('caption',
            fontName='Helvetica', fontSize=7.5, textColor=SKIP_GRAY,
            leading=11, alignment=TA_CENTER),

        'error_text': ParagraphStyle('error_text',
            fontName='Courier', fontSize=7, textColor=FAIL_RED,
            leading=10, leftIndent=8, spaceAfter=4, backColor=FAIL_BG),

        'footer': ParagraphStyle('footer',
            fontName='Helvetica', fontSize=7, textColor=SKIP_GRAY,
            alignment=TA_CENTER),

        'watermark': ParagraphStyle('watermark',
            fontName='Helvetica-Bold', fontSize=48,
            textColor=colors.HexColor('#F0F0F0'),
            alignment=TA_CENTER),
    }
    return styles


# ─────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────
def _status_color(status):
    return {
        'PASS':  (PASS_GREEN, PASS_BG),
        'FAIL':  (FAIL_RED,   FAIL_BG),
        'ERROR': (ERROR_ORG,  ERROR_BG),
        'SKIP':  (SKIP_GRAY,  LIGHT_GRAY),
    }.get(status, (DARK_GRAY, LIGHT_GRAY))


def _clean_test_name(raw):
    """Convert test_method_name to 'Method Name' for display."""
    name = raw.replace('test_', '', 1)
    return name.replace('_', ' ').title()


def _module_display(module):
    """Convert class name to readable section label."""
    mapping = {
        'TestAuthentication': '🔐 Authentication',
        'TestAircraft':       '✈️  Aircraft Management',
        'TestFuelPurchases':  '⛽ Fuel Purchases & Pricing',
        'TestFlights':        '🛫 Flight Trip Management',
        'TestDashboard':      '📊 Dashboard & KPIs',
        'TestFuelTransactions':'💳 Fuel Transactions',
        'TestDailyUsage':     '📅 Daily Usage',
        'TestReports':        '📋 Reports',
        'TestBusinessLogic':  '⚙️  Business Logic & Models',
        'TestSecurity':       '🔒 Security & Access Control',
    }
    return mapping.get(module, module)


def _bar_chart(module_stats):
    """Generate a simple bar chart of pass/fail per module."""
    drawing = Drawing(460, 160)

    modules = list(module_stats.keys())[:8]   # cap at 8 for readability
    pass_vals  = [module_stats[m]['PASS']  for m in modules]
    fail_vals  = [module_stats[m]['FAIL'] + module_stats[m]['ERROR'] for m in modules]
    short_labels = [m.replace('Test', '').replace('Authentication', 'Auth')
                     .replace('FuelPurchases', 'Fuel\nPurch.')
                     .replace('FuelTransactions', 'Fuel\nTrans.')
                     .replace('BusinessLogic', 'Logic')
                     .replace('DailyUsage', 'Daily') for m in modules]

    bc = VerticalBarChart()
    bc.x = 50
    bc.y = 30
    bc.width = 400
    bc.height = 110
    bc.data = [pass_vals, fail_vals]
    bc.groupSpacing = 12
    bc.barSpacing = 2

    bc.bars[0].fillColor = PASS_GREEN
    bc.bars[1].fillColor = FAIL_RED

    bc.valueAxis.valueMin = 0
    bc.valueAxis.valueMax = max(max(pass_vals), 1) + 2
    bc.valueAxis.valueStep = 2
    bc.valueAxis.labels.fontName = 'Helvetica'
    bc.valueAxis.labels.fontSize = 7

    bc.categoryAxis.categoryNames = short_labels
    bc.categoryAxis.labels.fontName = 'Helvetica'
    bc.categoryAxis.labels.fontSize = 6.5
    bc.categoryAxis.labels.angle = 0
    bc.categoryAxis.labels.dy = -4

    drawing.add(bc)

    # Legend
    drawing.add(Rect(50, 148, 10, 8, fillColor=PASS_GREEN, strokeColor=None))
    drawing.add(String(63, 148, 'Passed', fontName='Helvetica', fontSize=7, fillColor=DARK_GRAY))
    drawing.add(Rect(100, 148, 10, 8, fillColor=FAIL_RED, strokeColor=None))
    drawing.add(String(113, 148, 'Failed / Error', fontName='Helvetica', fontSize=7, fillColor=DARK_GRAY))

    return drawing


def _pie_chart(passed, failed, errors, skipped):
    """Generate an overall result pie chart."""
    drawing = Drawing(200, 140)
    pie = Pie()
    pie.x = 30
    pie.y = 15
    pie.width = 110
    pie.height = 110
    pie.data = []
    pie.labels = []
    pie.slices.strokeWidth = 0.5
    pie.slices.strokeColor = WHITE

    if passed:
        pie.data.append(passed)
        pie.labels.append(f'Pass ({passed})')
        pie.slices[len(pie.data)-1].fillColor = PASS_GREEN
    if failed:
        pie.data.append(failed)
        pie.labels.append(f'Fail ({failed})')
        pie.slices[len(pie.data)-1].fillColor = FAIL_RED
    if errors:
        pie.data.append(errors)
        pie.labels.append(f'Error ({errors})')
        pie.slices[len(pie.data)-1].fillColor = ERROR_ORG
    if skipped:
        pie.data.append(skipped)
        pie.labels.append(f'Skip ({skipped})')
        pie.slices[len(pie.data)-1].fillColor = SKIP_GRAY

    pie.labels = [''] * len(pie.data)  # hide labels (we use a legend)
    pie.sideLabels = 0
    drawing.add(pie)

    # Legend
    legend_items = []
    if passed:  legend_items.append((PASS_GREEN, f'Passed: {passed}'))
    if failed:  legend_items.append((FAIL_RED,   f'Failed: {failed}'))
    if errors:  legend_items.append((ERROR_ORG,  f'Errors: {errors}'))
    if skipped: legend_items.append((SKIP_GRAY,  f'Skipped: {skipped}'))

    for i, (clr, lbl) in enumerate(legend_items):
        y = 120 - i * 14
        drawing.add(Rect(150, y, 9, 9, fillColor=clr, strokeColor=None))
        drawing.add(String(162, y, lbl, fontName='Helvetica', fontSize=7.5, fillColor=DARK_GRAY))

    return drawing


# ─────────────────────────────────────────────────────────
# Page Callbacks (header/footer watermark)
# ─────────────────────────────────────────────────────────
class ReportCanvas:
    """Mixin for page decorations."""

    @staticmethod
    def on_first_page(canvas, doc):
        ReportCanvas._draw_watermark(canvas)

    @staticmethod
    def on_later_pages(canvas, doc):
        ReportCanvas._draw_watermark(canvas)
        ReportCanvas._draw_page_footer(canvas, doc)

    @staticmethod
    def _draw_watermark(canvas):
        canvas.saveState()
        canvas.setFont('Helvetica-Bold', 60)
        canvas.setFillColor(colors.HexColor('#EBEBEB'))
        canvas.translate(PAGE_W / 2, PAGE_H / 2)
        canvas.rotate(45)
        canvas.drawCentredString(0, 0, 'PROVISIONAL')
        canvas.restoreState()

    @staticmethod
    def _draw_page_footer(canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 7)
        canvas.setFillColor(SKIP_GRAY)
        page_text = f'Page {doc.page}  —  AeroFuel Manager | Automated Test Report  —  PROVISIONAL'
        canvas.drawCentredString(PAGE_W / 2, 18 * mm, page_text)
        canvas.setStrokeColor(MID_GRAY)
        canvas.setLineWidth(0.3)
        canvas.line(20 * mm, 21 * mm, PAGE_W - 20 * mm, 21 * mm)
        canvas.restoreState()


# ─────────────────────────────────────────────────────────
# Main Report Builder
# ─────────────────────────────────────────────────────────
def generate_pdf_report(collector, total_duration: float, output_dir: str = None) -> str:
    """
    Build and save the PDF test report.

    Args:
        collector:        ResultCollector instance from test_suite.py
        total_duration:   Total elapsed seconds for the test run
        output_dir:       Directory to save the PDF (defaults to backend/tests/reports/)

    Returns:
        Absolute path to the generated PDF file.
    """
    results = collector.results

    # ── Stats ───────────────────────────────────────────
    passed  = sum(1 for r in results if r.status == 'PASS')
    failed  = sum(1 for r in results if r.status == 'FAIL')
    errors  = sum(1 for r in results if r.status == 'ERROR')
    skipped = sum(1 for r in results if r.status == 'SKIP')
    total   = len(results)
    pass_pct = round((passed / total) * 100, 1) if total else 0

    # Group by module
    module_order = [
        'TestAuthentication', 'TestAircraft', 'TestFuelPurchases', 'TestFlights',
        'TestDashboard', 'TestFuelTransactions', 'TestDailyUsage',
        'TestReports', 'TestBusinessLogic', 'TestSecurity',
    ]
    modules = {}
    for r in results:
        modules.setdefault(r.module, []).append(r)

    # Stats per module
    module_stats = {}
    for mod in module_order:
        if mod in modules:
            rlist = modules[mod]
            module_stats[mod] = {
                'PASS':  sum(1 for r in rlist if r.status == 'PASS'),
                'FAIL':  sum(1 for r in rlist if r.status == 'FAIL'),
                'ERROR': sum(1 for r in rlist if r.status == 'ERROR'),
                'SKIP':  sum(1 for r in rlist if r.status == 'SKIP'),
                'total': len(rlist),
            }

    # ── Output path ─────────────────────────────────────
    if output_dir is None:
        output_dir = os.path.join(os.path.dirname(__file__), 'reports')
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'AeroFuel_Test_Report_{timestamp}.pdf'
    filepath = os.path.join(output_dir, filename)

    # ── Doc setup ───────────────────────────────────────
    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        topMargin=22 * mm,
        bottomMargin=28 * mm,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        title='AeroFuel Manager — Provisional Automated Test Report',
        author='AeroFuel QA System',
        subject='Automated Test Report',
    )

    S = build_styles()
    story = []
    usable_w = PAGE_W - 40 * mm

    # ════════════════════════════════════════════════════
    # COVER HEADER
    # ════════════════════════════════════════════════════
    header_data = [[
        Paragraph('✈  AeroFuel Manager', S['title']),
    ]]
    header_table = Table(header_data, colWidths=[usable_w])
    header_table.setStyle(TableStyle([
        ('BACKGROUND',  (0, 0), (-1, -1), NAVY),
        ('TOPPADDING',  (0, 0), (-1, -1), 18),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('ROUNDEDCORNERS', [8]),
    ]))
    story.append(header_table)

    sub_data = [[
        Paragraph('Aircraft Fuel Cost &amp; Trip Management System', S['subtitle']),
    ]]
    sub_table = Table(sub_data, colWidths=[usable_w])
    sub_table.setStyle(TableStyle([
        ('BACKGROUND',  (0, 0), (-1, -1), DARK_BLUE),
        ('TOPPADDING',  (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(sub_table)

    prov_data = [[
        Paragraph('⚠  PROVISIONAL AUTOMATED TEST REPORT  ⚠', S['provisional']),
    ]]
    prov_table = Table(prov_data, colWidths=[usable_w])
    prov_table.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), colors.HexColor('#2C2C2C')),
        ('TOPPADDING',    (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(prov_table)
    story.append(Spacer(1, 10))

    # ── Report metadata row ──────────────────────────────
    now = datetime.now()
    meta_rows = [
        ['Report Generated:', now.strftime('%d %B %Y, %I:%M:%S %p')],
        ['Test Environment:', 'In-Memory SQLite (Isolated)'],
        ['Framework:',        'Python unittest + Flask Test Client'],
        ['Backend Version:',  'Flask 3.0.3 / SQLAlchemy 2.0'],
        ['Report Status:',    '⚠  PROVISIONAL — Not for deployment sign-off'],
    ]
    meta_table = Table(meta_rows, colWidths=[55 * mm, usable_w - 55 * mm])
    meta_table.setStyle(TableStyle([
        ('FONTNAME',   (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME',   (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE',   (0, 0), (-1, -1), 8.5),
        ('TEXTCOLOR',  (0, 0), (0, -1), DARK_BLUE),
        ('TEXTCOLOR',  (1, 0), (1, -1), DARK_GRAY),
        ('TEXTCOLOR',  (1, 4), (1, 4),  GOLD),
        ('FONTNAME',   (1, 4), (1, 4),  'Helvetica-Bold'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [WHITE, LIGHT_GRAY]),
        ('BOX',        (0, 0), (-1, -1), 0.4, MID_GRAY),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 14))

    # ════════════════════════════════════════════════════
    # SUMMARY CARDS
    # ════════════════════════════════════════════════════
    story.append(Paragraph('Executive Summary', S['section_hdr']))
    story.append(HorizontalRule(usable_w, 1, ACCENT))
    story.append(Spacer(1, 8))

    card_w = (usable_w - 15) / 4
    card_row = [
        [SummaryCard('Total Tests', total,    DARK_BLUE,  WHITE,   card_w, 60),
         SummaryCard('Passed',      passed,   PASS_GREEN, WHITE,   card_w, 60),
         SummaryCard('Failed',      failed,   FAIL_RED,   WHITE,   card_w, 60),
         SummaryCard('Errors',      errors,   ERROR_ORG,  WHITE,   card_w, 60)],
    ]
    cards_table = Table(card_row, colWidths=[card_w] * 4, hAlign='LEFT')
    cards_table.setStyle(TableStyle([
        ('ALIGN',     (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN',    (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(cards_table)
    story.append(Spacer(1, 8))

    # Second row of cards
    card_row2 = [
        [SummaryCard('Skipped',    skipped,  SKIP_GRAY, WHITE, card_w, 48),
         SummaryCard('Pass Rate',  f'{pass_pct}%',
                     PASS_GREEN if pass_pct >= 80 else FAIL_RED, WHITE, card_w, 48),
         SummaryCard('Duration',   f'{total_duration}s', SKY_BLUE, WHITE, card_w, 48),
         SummaryCard('Test Modules', len(module_stats), DARK_BLUE, WHITE, card_w, 48)],
    ]
    cards_table2 = Table(card_row2, colWidths=[card_w] * 4, hAlign='LEFT')
    cards_table2.setStyle(TableStyle([
        ('ALIGN',     (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN',    (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(cards_table2)
    story.append(Spacer(1, 14))

    # ════════════════════════════════════════════════════
    # CHARTS SECTION
    # ════════════════════════════════════════════════════
    story.append(Paragraph('Visual Overview', S['section_hdr']))
    story.append(HorizontalRule(usable_w, 1, ACCENT))
    story.append(Spacer(1, 8))

    chart_row = [[
        _bar_chart(module_stats),
        _pie_chart(passed, failed, errors, skipped)
    ]]
    chart_table = Table(chart_row, colWidths=[usable_w * 0.68, usable_w * 0.32])
    chart_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(chart_table)
    story.append(Paragraph(
        'Left: Pass vs Fail per test module  |  Right: Overall result distribution',
        S['caption']
    ))
    story.append(Spacer(1, 12))

    # ════════════════════════════════════════════════════
    # MODULE SUMMARY TABLE
    # ════════════════════════════════════════════════════
    story.append(Paragraph('Module Summary', S['section_hdr']))
    story.append(HorizontalRule(usable_w, 1, ACCENT))
    story.append(Spacer(1, 6))

    mod_hdr = ['Module', 'Total', 'Passed', 'Failed', 'Errors', 'Skipped', 'Pass Rate', 'Status']
    mod_rows = [mod_hdr]
    for mod in module_order:
        if mod not in module_stats:
            continue
        st = module_stats[mod]
        rate = round((st['PASS'] / st['total']) * 100, 0) if st['total'] else 0
        overall = 'PASS' if (st['FAIL'] + st['ERROR']) == 0 else 'FAIL'
        mod_rows.append([
            _module_display(mod),
            st['total'], st['PASS'], st['FAIL'], st['ERROR'], st['SKIP'],
            f"{rate:.0f}%", overall
        ])

    # Totals row
    mod_rows.append([
        'TOTAL',
        total, passed, failed, errors, skipped,
        f'{pass_pct}%', 'PASS' if (failed + errors) == 0 else 'FAIL'
    ])

    col_widths = [70 * mm, 16 * mm, 16 * mm, 16 * mm, 16 * mm, 16 * mm, 20 * mm, 20 * mm]
    mod_table = Table(mod_rows, colWidths=col_widths)
    mod_style = [
        # Header
        ('BACKGROUND',    (0, 0), (-1, 0), DARK_BLUE),
        ('TEXTCOLOR',     (0, 0), (-1, 0), WHITE),
        ('FONTNAME',      (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE',      (0, 0), (-1, 0), 8),
        ('ALIGN',         (1, 0), (-1, -1), 'CENTER'),
        ('ALIGN',         (0, 0), (0, -1), 'LEFT'),
        ('TOPPADDING',    (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('FONTSIZE',      (0, 1), (-1, -1), 8),
        ('FONTNAME',      (0, 1), (-1, -1), 'Helvetica'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [WHITE, LIGHT_GRAY]),
        ('BOX',           (0, 0), (-1, -1), 0.5, MID_GRAY),
        ('INNERGRID',     (0, 0), (-1, -1), 0.2, MID_GRAY),
        # Totals row
        ('BACKGROUND',    (0, -1), (-1, -1), LIGHT_BLUE),
        ('FONTNAME',      (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE',      (0, -1), (-1, -1), 8),
    ]
    # Color PASS/FAIL in status column
    for i, row in enumerate(mod_rows[1:], start=1):
        status_val = row[-1]
        bg = PASS_BG if status_val == 'PASS' else FAIL_BG
        tc = PASS_GREEN if status_val == 'PASS' else FAIL_RED
        mod_style.append(('BACKGROUND', (7, i), (7, i), bg))
        mod_style.append(('TEXTCOLOR',  (7, i), (7, i), tc))
        mod_style.append(('FONTNAME',   (7, i), (7, i), 'Helvetica-Bold'))

    mod_table.setStyle(TableStyle(mod_style))
    story.append(mod_table)
    story.append(Spacer(1, 16))

    # ════════════════════════════════════════════════════
    # DETAILED RESULTS (per module)
    # ════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(Paragraph('Detailed Test Results', S['section_hdr']))
    story.append(HorizontalRule(usable_w, 1.2, ACCENT))
    story.append(Spacer(1, 8))

    test_num = 0
    for mod in module_order:
        if mod not in modules:
            continue
        rlist = modules[mod]
        mod_pass = sum(1 for r in rlist if r.status == 'PASS')
        mod_total = len(rlist)

        # Module header bar
        mod_label = _module_display(mod)
        mod_hdr_data = [[
            Paragraph(f'  {mod_label}', ParagraphStyle('mhdr',
                fontName='Helvetica-Bold', fontSize=9.5, textColor=WHITE)),
            Paragraph(f'{mod_pass}/{mod_total} passed', ParagraphStyle('mrate',
                fontName='Helvetica', fontSize=8.5, textColor=colors.HexColor('#AED6F1'),
                alignment=TA_RIGHT)),
        ]]
        mod_hdr_table = Table(mod_hdr_data, colWidths=[usable_w * 0.75, usable_w * 0.25])
        hdr_bg = PASS_GREEN if (mod_pass == mod_total) else FAIL_RED
        mod_hdr_table.setStyle(TableStyle([
            ('BACKGROUND',    (0, 0), (-1, -1), hdr_bg),
            ('TOPPADDING',    (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING',   (0, 0), (-1, -1), 8),
            ('RIGHTPADDING',  (0, 0), (-1, -1), 8),
            ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(KeepTogether([mod_hdr_table]))

        # Tests table
        test_hdr = ['#', 'Test Case', 'Status', 'Duration (s)']
        test_rows = [test_hdr]
        for r in rlist:
            test_num += 1
            test_rows.append([
                str(test_num),
                _clean_test_name(r.name),
                r.status,
                f'{r.duration:.4f}',
            ])

        t_widths = [10 * mm, usable_w - 60 * mm, 22 * mm, 25 * mm]
        test_table = Table(test_rows, colWidths=t_widths)
        t_style = [
            ('BACKGROUND',    (0, 0), (-1, 0), SKY_BLUE),
            ('TEXTCOLOR',     (0, 0), (-1, 0), WHITE),
            ('FONTNAME',      (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE',      (0, 0), (-1, 0), 7.5),
            ('ALIGN',         (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN',         (2, 0), (2, -1), 'CENTER'),
            ('ALIGN',         (3, 0), (3, -1), 'RIGHT'),
            ('ALIGN',         (0, 0), (0, -1), 'CENTER'),
            ('FONTSIZE',      (0, 1), (-1, -1), 8),
            ('FONTNAME',      (0, 1), (-1, -1), 'Helvetica'),
            ('TOPPADDING',    (0, 0), (-1, -1), 3.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, LIGHT_GRAY]),
            ('INNERGRID',     (0, 0), (-1, -1), 0.2, MID_GRAY),
            ('BOX',           (0, 0), (-1, -1), 0.4, MID_GRAY),
        ]
        # Color status cells
        for i, row in enumerate(test_rows[1:], start=1):
            st = row[2]
            tc, bg = _status_color(st)
            t_style.append(('TEXTCOLOR',  (2, i), (2, i), tc))
            t_style.append(('BACKGROUND', (2, i), (2, i), bg))
            t_style.append(('FONTNAME',   (2, i), (2, i), 'Helvetica-Bold'))

        test_table.setStyle(TableStyle(t_style))
        story.append(test_table)

        # Error details for failures/errors
        failures = [r for r in rlist if r.status in ('FAIL', 'ERROR') and r.error]
        if failures:
            story.append(Spacer(1, 4))
            story.append(Paragraph('  Failure / Error Details:', ParagraphStyle('fhdr',
                fontName='Helvetica-Bold', fontSize=8, textColor=FAIL_RED)))
            for fr in failures:
                err_preview = fr.error[:600] + ('...' if len(fr.error) > 600 else '')
                story.append(Paragraph(
                    f'• [{fr.status}] {_clean_test_name(fr.name)}:\n{err_preview}',
                    S['error_text']
                ))

        story.append(Spacer(1, 10))

    # ════════════════════════════════════════════════════
    # PROVISIONAL DISCLAIMER PAGE
    # ════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(Spacer(1, 30))

    disclaimer_hdr = Table([[
        Paragraph('⚠  PROVISIONAL REPORT — IMPORTANT NOTICE  ⚠', ParagraphStyle('dh',
            fontName='Helvetica-Bold', fontSize=13, textColor=WHITE,
            alignment=TA_CENTER))
    ]], colWidths=[usable_w])
    disclaimer_hdr.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), colors.HexColor('#7D3C00')),
        ('TOPPADDING',    (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(disclaimer_hdr)
    story.append(Spacer(1, 10))

    disclaimer_text = """
This document is a <b>PROVISIONAL AUTOMATED TEST REPORT</b> generated by the AeroFuel Manager 
Automated QA Framework. It is intended for <b>internal development review purposes only</b>.

<br/><br/><b>Scope of Testing:</b><br/>
This report covers automated unit and integration tests for the backend REST API of the 
Aircraft Fuel Cost &amp; Trip Management System. Tests are executed against an isolated 
<b>in-memory SQLite database</b> using seeded fixture data. Results may not reflect the 
behavior of the system against a production PostgreSQL database.

<br/><br/><b>Limitations:</b><br/>
• Frontend (React) components are <b>not covered</b> by this report<br/>
• End-to-end browser tests are <b>not included</b><br/>
• Load/stress/performance tests are <b>not conducted</b><br/>
• Database migration tests are <b>not conducted</b><br/>
• Tests marked ERROR may indicate environment issues, not application defects<br/>

<br/><br/><b>Intended Audience:</b><br/>
Development team and internal QA reviewers. This report <b>must not</b> be used as evidence 
of production readiness or as a basis for regulatory sign-off without further independent 
validation.

<br/><br/><b>Report Generation:</b><br/>
Automatically generated on <b>{date}</b> by the AeroFuel QA pipeline.<br/>
Python unittest framework with Flask Test Client, SQLite in-memory database.
    """.format(date=now.strftime('%d %B %Y at %H:%M:%S'))

    story.append(Paragraph(disclaimer_text.strip(), ParagraphStyle('disc',
        fontName='Helvetica', fontSize=9, textColor=DARK_GRAY, leading=15,
        alignment=TA_JUSTIFY, leftIndent=8, rightIndent=8,
        borderPad=10, backColor=LIGHT_GRAY,
        borderWidth=0.5, borderColor=MID_GRAY, borderRadius=4)))
    story.append(Spacer(1, 20))

    # Sign-off table
    signoff_data = [
        ['Prepared By', 'Reviewed By', 'Approved By'],
        ['AeroFuel QA Automation', '__________________________', '__________________________'],
        ['System Generated', 'Date: ___________________', 'Date: ___________________'],
    ]
    signoff_table = Table(signoff_data, colWidths=[usable_w / 3] * 3)
    signoff_table.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, 0), DARK_BLUE),
        ('TEXTCOLOR',     (0, 0), (-1, 0), WHITE),
        ('FONTNAME',      (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE',      (0, 0), (-1, -1), 8.5),
        ('ALIGN',         (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING',    (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('INNERGRID',     (0, 0), (-1, -1), 0.3, MID_GRAY),
        ('BOX',           (0, 0), (-1, -1), 0.5, DARK_BLUE),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, LIGHT_GRAY]),
    ]))
    story.append(signoff_table)

    # ── Build PDF ────────────────────────────────────────
    doc.build(
        story,
        onFirstPage=ReportCanvas.on_first_page,
        onLaterPages=ReportCanvas.on_later_pages,
    )

    return filepath


# ─────────────────────────────────────────────────────────
# Standalone entry point (if called directly)
# ─────────────────────────────────────────────────────────
if __name__ == '__main__':
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
    from tests.test_suite import run_tests
    import time
    start = time.perf_counter()
    collector = run_tests()
    elapsed = round(time.perf_counter() - start, 2)
    path = generate_pdf_report(collector, elapsed)
    print(f"\nReport saved to: {path}")
