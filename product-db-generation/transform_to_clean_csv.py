#!/usr/bin/env python3
"""
Transform RawAmazonData.csv into a clean product CSV matching the format of
skin addiction - Sheet1.csv: id, name, description, labels, image_links, product_link, price.

- Uses the reference sheet for products that appear there (by ASIN): keeps their
  description, labels, and image_links.
- For other products, uses Anthropic (Claude) to generate a polished description
  and labels from the raw scraped text. Set ANTHROPIC_API_KEY to enable generation.

Output: comma-separated CSV with quoted fields where needed (same as reference).

Usage:
  pip install -r requirements.txt   # or: conda activate your_env && pip install anthropic
  export ANTHROPIC_API_KEY=your_key   # or use .env in this dir or skin-care-addiction/
  python transform_to_clean_csv.py    # use the same Python that has anthropic installed
"""

import csv
import json
import os
import re
from pathlib import Path

DIR = Path(__file__).resolve().parent

# Load .env from this dir or sibling skin-care-addiction so ANTHROPIC_API_KEY is set
def _load_dotenv():
    for env_path in [DIR / ".env", DIR.parent / "skin-care-addiction" / ".env"]:
        if env_path.exists():
            with open(env_path, encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        val = v.strip().strip('"').strip("'")
                        if "\n" in val:
                            val = val.split("\n")[0]
                        os.environ.setdefault(k.strip(), val)
            return
_load_dotenv()
INPUT_CSV = DIR / "RawAmazonData.csv"
REFERENCE_CSV = DIR / "skin addiction - Sheet1.csv"
OUTPUT_CSV = DIR / "CleanProductData.csv"

ALLOWED_LABELS = [
    "Whiteheads", "Blackheads", "Cystic acne", "Hormonal breakouts", "Acne scarring",
    "Textured skin", "Large pores", "Hyperpigmentation", "Post-inflammatory hyperpigmentation",
    "Melasma", "Uneven skin tone", "Wrinkles", "Fine lines", "Oily skin", "Dry skin",
    "Combination skin", "Normal skin",
]

LABELS_STR = ", ".join(ALLOWED_LABELS)


def _extract_asin(url: str) -> str:
    m = re.search(r"/dp/([A-Z0-9]{9,10})", url or "")
    return m.group(1) if m else ""


def load_reference_by_asin() -> dict:
    """Load reference CSV and return dict asin -> {description, labels, image_links}."""
    ref = {}
    with open(REFERENCE_CSV, newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)
        # id, name, description, labels, image_links, product_link, price
        idx = {h: i for i, h in enumerate(header)}
        for row in reader:
            if len(row) < 7:
                continue
            product_link = row[idx["product_link"]].strip()
            asin = _extract_asin(product_link)
            if not asin:
                continue
            ref[asin] = {
                "description": row[idx["description"]],
                "labels": row[idx["labels"]].strip(),
                "image_links": row[idx["image_links"]].strip(),
                "price": row[idx["price"]].strip(),
            }
    return ref


def _get(row: dict, key: str) -> str:
    return (row.get(key) or "").strip()


def raw_text_for_llm(row: dict) -> str:
    """Single block of text from raw row for LLM context (no heavy cleaning)."""
    parts = [
        _get(row, "productDescription"),
        _get(row, "additionalInfo"),
        _get(row, "aboutProduct"),
    ]
    blob = "\n\n".join(p for p in parts if p)
    # Collapse huge whitespace but keep some structure
    blob = re.sub(r"\n{3,}", "\n\n", blob)
    blob = re.sub(r" {2,}", " ", blob)
    return blob[:12000].strip() or _get(row, "title")  # cap length for API


def _fallback_labels(title: str, raw_text: str) -> str:
    """Keyword-based label matching when API is not used."""
    def norm(s: str) -> str:
        return s.lower().replace("-", " ")
    text = norm(f"{title} {raw_text}")
    matched = [l for l in ALLOWED_LABELS if norm(l) in text]
    return ",".join(matched).lower() if matched else ""


def generate_description_and_labels(title: str, raw_text: str) -> tuple[str, str]:
    """Call Anthropic to generate polished description and labels. Returns (description, labels)."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        # Fallback: use title + truncated raw as description, keyword-derived labels
        desc = f"{title}\n\n{raw_text[:1500]}" if raw_text else title
        return desc, _fallback_labels(title, raw_text)

    try:
        import anthropic
    except ImportError:
        return title + "\n\n" + (raw_text[:1500] or ""), _fallback_labels(title, raw_text)

    client = anthropic.Anthropic()
    system = """You are a skincare copywriter. Given a product title and raw scraped product info from Amazon, you produce:
1. A polished, helpful product description (for a skincare app) with clear sections: a short intro sentence, then "Key Benefits:" or "Key Features:" with bullet points, then "How to Use:" with brief steps, then "Customer Feedback:" or "What customers say:" with one short paragraph. Use newlines between sections. Write in a neutral, informative tone. Do not invent specific stats or reviews; generalize from the raw text.
2. A comma-separated list of skin-concern labels chosen ONLY from this exact list (use these strings verbatim, any casing): """ + LABELS_STR + """. Pick only the labels that clearly apply to the product (2-5 labels typically). Output nothing else for labels."""

    user = f"""Product title:\n{title}\n\nRaw product info (scraped):\n{raw_text[:10000]}\n\nRespond with a JSON object only, no markdown, with two keys: "description" (string, use \\n for newlines) and "labels" (string, comma-separated from the allowed list only)."""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
    except Exception as e:
        print(f"    API error: {e}", flush=True)
        return f"{title}\n\n{(raw_text[:1500] or '')}", _fallback_labels(title, raw_text)
    text = response.content[0].text if response.content else ""
    # Strip optional markdown code fence
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```\s*$", "", text)
    text = text.strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return f"{title}\n\n{(raw_text[:1500] or '')}", _fallback_labels(title, raw_text)
    desc = (data.get("description") or title).replace("\\n", "\n")
    labels = (data.get("labels") or "").strip()
    return desc, labels


def normalize_price(raw: str) -> str:
    """Return price string to match reference style: no $ for decimals, optional $ for whole."""
    raw = (raw or "").strip()
    if not raw:
        return ""
    m = re.match(r"^\$?\s*(\d+(?:\.\d+)?)\s*$", raw)
    if m:
        num = float(m.group(1))
        if num == int(num):
            return str(int(num))  # e.g. 15, 42
        return f"{num:.2f}"  # e.g. 12.99
    return raw


def main() -> None:
    ref_by_asin = load_reference_by_asin()

    out_rows: list[dict] = []
    with open(INPUT_CSV, newline="", encoding="utf-8") as f:
        raw_rows = list(csv.DictReader(f))

    total = len(raw_rows)
    for i, row in enumerate(raw_rows, start=1):
        title = _get(row, "title")
        url = _get(row, "url")
        asin = _extract_asin(url)
        print(f"[{i}/{total}] {title[:60]}...", flush=True)

        if asin in ref_by_asin:
            # Reuse hand-curated data from reference sheet
            r = ref_by_asin[asin]
            out_rows.append({
                "name": title,
                "description": r["description"],
                "labels": r["labels"].lower(),
                "image_links": r["image_links"],
                "product_link": url,
                "price": r["price"],
            })
        else:
            # Generate description + labels via Claude API
            raw_text = raw_text_for_llm(row)
            desc, labels = generate_description_and_labels(title, raw_text)
            image_links = (
                f"https://images-na.ssl-images-amazon.com/images/P/{asin}.01.jpg"
                if asin else ""
            )
            out_rows.append({
                "name": title,
                "description": desc,
                "labels": labels.lower(),
                "image_links": image_links,
                "product_link": url,
                "price": normalize_price(_get(row, "wholePriceBlockText")),
            })

    # Write CSV in same format as reference: comma delimiter, QUOTE_MINIMAL (quotes where needed)
    out_columns = ["id", "name", "description", "labels", "image_links", "product_link", "price"]
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f, delimiter=",", quoting=csv.QUOTE_MINIMAL)
        writer.writerow(out_columns)
        for i, r in enumerate(out_rows, start=1):
            writer.writerow([
                i,
                r["name"],
                r["description"],
                r["labels"],
                r["image_links"],
                r["product_link"],
                r["price"],
            ])

    print(f"Wrote {len(out_rows)} rows to {OUTPUT_CSV}")


if __name__ == "__main__":
    main()
