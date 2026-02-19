#!/usr/bin/env python3
"""
PDF Form Field Auditor for Bankruptcy Forms
============================================
Reads a fillable (or filled) PDF and reports:
  - Every filled field with its value
  - Every empty field
  - Coverage percentage
  - Per-page breakdown

Usage:
  python3 audit_pdf_fields.py <path_to_pdf>

Example:
  python3 audit_pdf_fields.py Official-Form-101-Nicholas-Wallace-2026-02-17.pdf
"""

import sys
import json
from pypdf import PdfReader


def audit_pdf(path: str, output_json: bool = False):
    reader = PdfReader(path)
    filled = []
    empty = []
    page_stats = {}

    for page_num, page in enumerate(reader.pages):
        p = page_num + 1
        page_stats[p] = {"filled": 0, "empty": 0}

        if "/Annots" not in page:
            continue

        for annot in page["/Annots"]:
            obj = annot.get_object()
            field_name = str(obj.get("/T", "")) or "(unnamed)"
            field_type = str(obj.get("/FT", ""))
            value = obj.get("/V", None)

            # Resolve field type to human-readable
            type_map = {"/Tx": "text", "/Btn": "checkbox", "/Ch": "dropdown"}
            friendly_type = type_map.get(field_type, field_type or "unknown")

            # Check if field has a meaningful value
            has_value = (
                value is not None
                and str(value).strip() != ""
                and str(value) != "/Off"
            )

            entry = {
                "page": p,
                "name": field_name,
                "type": friendly_type,
            }

            if has_value:
                entry["value"] = str(value)
                filled.append(entry)
                page_stats[p]["filled"] += 1
            else:
                empty.append(entry)
                page_stats[p]["empty"] += 1

    total = len(filled) + len(empty)
    pct = (len(filled) / total * 100) if total > 0 else 0

    if output_json:
        print(json.dumps({
            "file": path,
            "total_fields": total,
            "filled_count": len(filled),
            "empty_count": len(empty),
            "coverage_pct": round(pct, 1),
            "filled": filled,
            "empty": empty,
            "per_page": page_stats,
        }, indent=2))
        return

    # --- Human-readable output ---
    print(f"{'='*70}")
    print(f"PDF FORM AUDIT: {path}")
    print(f"{'='*70}")
    print(f"Pages: {len(reader.pages)}")
    print(f"Total fields: {total}")
    print(f"Filled: {len(filled)}  |  Empty: {len(empty)}  |  Coverage: {pct:.1f}%")
    print()

    # Per-page summary
    print(f"{'PAGE':>4}  {'FILLED':>6}  {'EMPTY':>5}  {'COVERAGE':>8}")
    print(f"{'----':>4}  {'------':>6}  {'-----':>5}  {'--------':>8}")
    for p in sorted(page_stats.keys()):
        s = page_stats[p]
        t = s["filled"] + s["empty"]
        pc = (s["filled"] / t * 100) if t > 0 else 0
        bar = "#" * int(pc / 5) + "." * (20 - int(pc / 5))
        print(f"{p:>4}  {s['filled']:>6}  {s['empty']:>5}  {pc:>6.0f}%  {bar}")
    print()

    # Filled fields
    print(f"FILLED FIELDS ({len(filled)})")
    print(f"{'-'*70}")
    for f in filled:
        val = f["value"]
        if len(val) > 60:
            val = val[:57] + "..."
        print(f"  p{f['page']}  {f['type']:10s}  {f['name']:42s}  {val}")
    print()

    # Empty named fields (skip unnamed for readability, show count)
    named_empty = [f for f in empty if f["name"] != "(unnamed)"]
    unnamed_count = len(empty) - len(named_empty)

    print(f"EMPTY NAMED FIELDS ({len(named_empty)})")
    print(f"{'-'*70}")
    for f in named_empty:
        print(f"  p{f['page']}  {f['type']:10s}  {f['name']}")

    if unnamed_count > 0:
        print(f"\n  + {unnamed_count} unnamed checkbox/button fields (mapped by position)")

    # Critical missing fields check (B101-specific)
    print(f"\n{'='*70}")
    print("B101 CRITICAL FIELD CHECK")
    print(f"{'='*70}")

    critical_checks = [
        ("Chapter selection", lambda: any("Check Box1" in f["name"] or "chapter" in f["name"].lower() for f in filled)),
        ("Venue basis (Q6)", lambda: any("Check Box5" in f["name"] or "venue" in f["name"].lower() for f in filled)),
        ("Fee payment (Q8)", lambda: any("Check Box7" in f["name"] or "fee" in f["name"].lower() for f in filled)),
        ("Prior bankruptcy (Q9)", lambda: any("Check Box8" in f["name"] for f in filled)),
        ("Credit counseling (Q15)", lambda: any("Check Box16" in f["name"] or "Check Box17" in f["name"] for f in filled)),
        ("Debt type (Q16)", lambda: any("Check Box18" in f["name"] for f in filled)),
        ("Creditor count (Q18)", lambda: any("Check Box21" in f["name"] for f in filled)),
        ("Asset estimate (Q19)", lambda: any("Check Box22" in f["name"] for f in filled)),
        ("Liability estimate (Q20)", lambda: any("Check Box23" in f["name"] for f in filled)),
        ("Debtor 1 signature", lambda: any(f["name"] == "signature" and f["page"] == 7 for f in filled)),
        ("Signature date", lambda: any(f["name"] == "Executed on" for f in filled)),
        ("Attorney name", lambda: any(f["name"] == "Printed name" for f in filled)),
        ("Attorney bar #", lambda: any(f["name"] == "Bar number" for f in filled)),
        ("Attorney phone", lambda: any(f["name"] == "phone" for f in filled)),
        ("Attorney email", lambda: any(f["name"] == "Email address" and f["page"] == 8 for f in filled)),
        ("District dropdown", lambda: any(f["name"] == "Bankruptcy District Information" for f in filled)),
        ("Debtor 1 first name", lambda: any(f["name"] == "First name" and f["page"] == 1 for f in filled)),
        ("Debtor 1 SSN last 4", lambda: any(f["name"] == "SSNum" for f in filled)),
        ("Debtor 1 address", lambda: any(f["name"] == "Street" and f["page"] == 2 for f in filled)),
    ]

    pass_count = 0
    for label, check in critical_checks:
        ok = check()
        if ok:
            pass_count += 1
        status = "PASS" if ok else "FAIL"
        icon = "✓" if ok else "✗"
        print(f"  {icon} {status:4s}  {label}")

    print(f"\n  Score: {pass_count}/{len(critical_checks)} critical checks passed")
    court_ready = all(check() for _, check in critical_checks)
    print(f"  Court-fileable: {'YES' if court_ready else 'NO'}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"Usage: python3 {sys.argv[0]} <path_to_pdf> [--json]")
        sys.exit(1)

    pdf_path = sys.argv[1]
    json_mode = "--json" in sys.argv

    audit_pdf(pdf_path, output_json=json_mode)
