"""
run_tests.py — One-click runner for the AeroFuel automated test suite.

Usage (from backend/ directory):
    python run_tests.py              # Run tests + print console summary
    python run_tests.py --pdf        # Run tests + generate PDF report
    python run_tests.py --verbose    # Show per-test names in console too
"""

import sys
import os
import time

# ── Ensure backend/ is on path ─────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

STATUS_ICONS = {'PASS': '[OK]  ', 'FAIL': '[FAIL]', 'ERROR': '[ERR] ', 'SKIP': '[SKIP]'}

BANNER = r"""
 ___           ___         _   ___        _
/ _ \  _  _  / __|  ___  | | | __|  _   | |
\__, / | || | \__ \ / -_) | | | _|  | || | |
  /_/   \_,_| |___/ \___| |_| |_|    \_,_| |___|
  AeroFuel Manager - Automated Test Runner
"""


def print_banner():
    print('\033[94m' + BANNER + '\033[0m')


def run_all(verbose=False, generate_pdf=False):
    print_banner()
    # Force UTF-8 output so emojis/special chars in PDF gen don't crash
    if hasattr(sys.stdout, 'reconfigure'):
        try:
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    print('=' * 65)
    print('  Starting test suite ...')
    print('=' * 65)

    from tests.test_suite import run_tests

    start = time.perf_counter()
    collector = run_tests()
    elapsed = round(time.perf_counter() - start, 2)

    results = collector.results
    passed  = sum(1 for r in results if r.status == 'PASS')
    failed  = sum(1 for r in results if r.status == 'FAIL')
    errors  = sum(1 for r in results if r.status == 'ERROR')
    skipped = sum(1 for r in results if r.status == 'SKIP')
    total   = len(results)
    pass_pct = round((passed / total) * 100, 1) if total else 0

    # ── Console output ──────────────────────────────────
    if verbose:
        current_module = None
        for r in results:
            if r.module != current_module:
                current_module = r.module
                print(f'\n  \033[96m[ {r.module} ]\033[0m')
            icon = STATUS_ICONS.get(r.status, '•')
            color = {
                'PASS': '\033[92m', 'FAIL': '\033[91m',
                'ERROR': '\033[93m', 'SKIP': '\033[90m'
            }.get(r.status, '')
            reset = '\033[0m'
            print(f'    {icon} {color}{r.status}{reset}  {r.name}  ({r.duration:.4f}s)')
            if r.error and r.status in ('FAIL', 'ERROR'):
                for line in r.error.split('\n')[-5:]:
                    print(f'         \033[91m{line}\033[0m')

    print('\n' + '=' * 65)
    print(f'  Results: {total} tests | '
          f'\033[92m{passed} passed\033[0m | '
          f'\033[91m{failed} failed\033[0m | '
          f'\033[93m{errors} errors\033[0m | '
          f'\033[90m{skipped} skipped\033[0m')
    print(f'  Pass Rate : {pass_pct}%   Duration: {elapsed}s')
    print('=' * 65)

    overall = 'PASSED' if (failed + errors) == 0 else 'FAILED'
    color = '\033[92m' if (failed + errors) == 0 else '\033[91m'
    print(f'\n  Overall: {color}{overall}\033[0m\n')

    # ── PDF ─────────────────────────────────────────────
    if generate_pdf:
        print('  Generating PDF report ...')
        try:
            from tests.report_generator import generate_pdf_report
            pdf_path = generate_pdf_report(collector, elapsed)
            print(f'\n  [PDF] Saved to:')
            print(f'     {pdf_path}\n')
            # Open on Windows automatically
            if sys.platform == 'win32':
                os.startfile(pdf_path)
        except Exception as e:
            print(f'\n  [WARNING] PDF generation failed: {e}\n')
            import traceback; traceback.print_exc()

    return 0 if (failed + errors) == 0 else 1


if __name__ == '__main__':
    verbose = '--verbose' in sys.argv or '-v' in sys.argv
    pdf     = '--pdf' in sys.argv or '--report' in sys.argv
    sys.exit(run_all(verbose=verbose, generate_pdf=pdf))
