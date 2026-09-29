"""Load the Glyf Pad user parameters from ../../parameters.csv into the open design.

Run from Fusion 360: Utilities > Add-Ins > Scripts and Add-Ins, add this folder
with the + button, then Run. Run it again after you edit the CSV: existing
parameters are updated in place, so features that use them rebuild.
"""

import csv
import os
import traceback

import adsk.core
import adsk.fusion

CSV_PATH = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "parameters.csv")
)


def run(context):
    ui = None
    try:
        app = adsk.core.Application.get()
        ui = app.userInterface
        design = adsk.fusion.Design.cast(app.activeProduct)
        if not design:
            ui.messageBox("Open a Fusion design, then run this script again.")
            return

        params = design.userParameters
        added = updated = 0
        # Rows are in dependency order: a derived row only uses names above it.
        with open(CSV_PATH, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                name = row["name"].strip()
                expression = row["expression"].strip()
                comment = row["comment"].strip()
                param = params.itemByName(name)
                if param:
                    param.expression = expression
                    param.comment = comment
                    updated += 1
                else:
                    value = adsk.core.ValueInput.createByString(expression)
                    params.add(name, value, row["unit"].strip(), comment)
                    added += 1

        ui.messageBox(f"Glyf Pad parameters: {added} added, {updated} updated.\n{CSV_PATH}")
    except Exception:
        if ui:
            ui.messageBox(f"Glyf Pad parameters failed:\n{traceback.format_exc()}")
