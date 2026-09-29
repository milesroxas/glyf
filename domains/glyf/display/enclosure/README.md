# Glyf Pad enclosure

Industrial design spec for the Glyf display module housing (working name Glyf Pad), and the Fusion 360 setup to model it. The design board is the "Glyf Pad · Industrial Design" artboard in the Glyf Paper file. Screen, wiring, and HID protocol: [glyf.md](../docs/glyf.md).

[`parameters.csv`](parameters.csv) holds every dimension as a Fusion 360 user parameter and is the source of truth. This doc explains the parameters. It does not repeat all of them.

| File | What |
|------|------|
| [`parameters.csv`](parameters.csv) | 102 user parameters: group, name, unit, expression, comment. Derived rows use names above them. |
| [`fusion/GlyfPadParameters/`](fusion/GlyfPadParameters/) | Fusion 360 script that loads the CSV into the open design |

## Load the parameters into Fusion 360

1. Create a design. In Preferences > General > Design, set the default modeling orientation to Z up. Set the document units to mm.
2. Open Utilities > Add-Ins > Scripts and Add-Ins (Shift+S).
3. Click **+** next to My Scripts and select the `fusion/GlyfPadParameters` folder.
4. Select **GlyfPadParameters** and click **Run**. A message gives the number of parameters added and updated.
5. Open Modify > Change Parameters to check the values.

To change a dimension, edit the CSV and run the script again. The script updates existing parameters in place, so the features that use them rebuild. Do not edit values in the Change Parameters dialog: the next run overwrites them.

## Datum and axes

- **Origin:** the back-left corner of the top face.
- **Axes:** +X to the right. −Y toward the front, where the user sits. +Z up, normal to the top face.
- **Plan dimensions** are measured on the top face. A `*_x` parameter is a distance from the left edge. A `*_y` parameter is a distance from the back edge, so it is a negative Y coordinate in a sketch.
- **Depths** (`split_z`, `mx_plate_to_pcb`, `usbc_z`) are measured down from the top face.
- Model the top case and everything inside it square to the top face. Only the base knows about `tilt`.

## Layout

Two bands and two axes.

- **Back band:** the screen window on the left. On the right, the encoder row sits on the window's back line and the utility row sits on its front line, so the right side spans the same depth as the screen.
- **Front band:** the key block, the primary key, and the dial, all centered on the key block's center line (`pri_y`).
- **Axis a** (`ctl_a_x`) carries encoder 1, the Home key, and the primary key.
- **Axis b** (`ctl_b_x`) carries encoder 2, the Layers key, and the dial.
- **Mid axis** (`ctl_m_x`) carries the Fn key.

The screen and the dial, the two largest items, sit on opposite corners and balance each other. The keys and the encoders fill the other two corners.

The screen sets the key grid. `key_pitch` = `scr_aa_w / key_cols` = 20.88 mm, which is 120 px of screen. Each key sits directly under its label.

### Why the primary key sits there

The user presses the primary key first and then almost always a secondary key. The primary key therefore sits right beside the key block, on the block's center line, 8.87 mm from the fourth column. With the fingers over the eight secondary keys, the left thumb falls on the primary key. The thumb presses the primary key, then a finger presses the next key, and the hand does not move. A one-finger user reaches every secondary key within one key block width.

### Centers

Derived from the parameters. Use them to check the model.

| Control | Center x | Center y | Size |
|---------|---------:|---------:|------|
| Encoder 1 | 122.00 | 28.50 | Ø19 knob |
| Encoder 2 | 161.00 | 28.50 | Ø19 knob |
| Home, Fn, Layers | 122.00, 141.50, 161.00 | 72.38 | 16 × 7 caps |
| Primary key | 122.00 | 101.32 | 18 × 18 cap in a 22 × 22 well |
| Dial | 161.00 | 101.32 | Ø38 knob |
| Secondary keys | 30.49 + n × 20.88 | 90.88, 111.76 | 18 × 18 caps |
| Screen window | 19.00 (left edge) | 19.00 (back edge) | 85.22 × 56.88 |

### Clearances

Keep these when you move anything.

| Between | Clearance (mm) |
|---------|---------------:|
| Screen module and inner wall | 1.93 |
| Screen module and encoder 1 EC11 body | 3.03 |
| Screen boss and Home slot | 0.88 |
| Window and Home cap | 9.78 |
| Encoder knobs | 20.00 |
| Encoder knob and utility cap | 30.88 |
| Utility caps | 3.50 |
| Utility cap and dial | 6.44 |
| Home cap and primary well | 14.44 |
| Key block and primary well | 8.87 |
| Primary well and dial | 9.00 |
| Dial and right edge | 12.00 |
| Dial and front edge | 15.68 |
| Pico and PCB inner edge | 3.53 |
| Pico and encoder pins | 6.00 |

The screen boss and Home slot clearance is tight on purpose. The Home cap has its retaining flange on the front and back edges only (`util_flange_t`), so nothing on the cap reaches toward the boss.

The band between the encoder row and the utility row is 30.88 mm deep. It gives the fingers room to pinch an encoder, and the Pico sits under it.

## Control hierarchy

Rank comes from color, height, and frame. Size only separates keys from utilities. The primary key has the same footprint as a secondary key, so it is never the largest item. The dial is the largest control.

| Tier | Part | Size | Height | Switch | Finish |
|------|------|------|--------|--------|--------|
| Primary | 1 × 1U MX cap in a machined well | 18 × 18 cap. Well `pri_well` 22 × 22, R4.2, 1.0 deep | Cap 12.0 mm, 2.5 mm above the secondaries | 5-pin PCB-mount MX tactile, heavier than the secondaries | Green PBT, spherical dish. Well edge has a 0.5 mm bright-cut chamfer |
| Secondary | 8 × 1U MX caps | 18 × 18 on `key_pitch` | Cap 9.5 mm | MX linear, light | Light gray PBT, cylindrical dish, blank. The screen names each key |
| Utility | 3 plunger caps: Home, Fn, Layers | 16 × 7, R2, on `util_pitch` | 1.5 mm above the top face | 6 × 6 mm SMD tact switch | Graphite anodized aluminium, laser-etched glyph |
| Dial | Knurled knob | Ø38 | 10 mm | EC11 type, no detents, push switch | Bead-blasted, clear-anodized 6061. Straight knurl. Ø8.4 finger dimple |
| Encoders | 2 knurled knobs | Ø19 | 14 mm | EC11 type, detented, push switch | Same as the dial, with a pointer line |

The utility keys change what the screen shows, so they sit beside it, in one row whose front edge lines up with the window's front edge (`util_y`). Home sits on axis a, above the primary key. Layers sits on axis b, above the dial: press Layers, then turn the dial to pick a layer. Fn latches, and the screen relabels the keys while it is on. At 1.5 mm proud, a finger that spins the dial does not press Layers.

The primary well leaves 0.5 mm of skin under the cap. That is too thin for MX clips, which need a 1.5 mm plate. The primary is therefore a 5-pin PCB-mount switch, held by its hot-swap socket and PCB pegs, and its skin hole is `pri_sw_cut` (15 mm) so the housing floats.

The encoders sit in one row, level with the top of the window. The screen shows their values in the same row and order (`Zoom`, `Stroke`), with a two-dot mark on each value.

## Inside

| Part | Position | Notes |
|------|----------|-------|
| Main PCB | L-shaped, 1.6 mm FR-4, top at `mx_plate_to_pcb` | It wraps the screen module on two sides with 1.5 mm clearance. It carries the MX hot-swap sockets, the three EC11s, and the three tact switches. |
| Screen module | `scr_x`, `scr_y`, glass under the window | 4 × M2.5 into bosses of length `scr_boss_h`. The glass presses on a `scr_gasket_t` foam gasket. Remove the straight header pins: with them the module is 14 mm deep. Wire the 14 pins to J1 in the key band's left margin. |
| Pico | `pico_x`, `pico_y`, on the PCB underside | Soldered flat by its castellations, component side down. Long side along X, USB end to the right. It lies under the band between the encoder row and the utility row. No through-hole pins reach this area. |
| USB-C | `usbc_x` (axis b), in the back wall behind encoder 2 | Receptacle on the PCB underside. D+ and D− go to the Pico's TP3 and TP2 pads, VBUS goes to pin 40. Fit 5.1 kΩ pull-downs on CC1 and CC2. The Pico's own micro-USB is not used. |
| BOOTSEL | Faces the floor | A `bootsel_hole_d` pinhole in the base reaches it. Take its position from the Pico STEP. |
| SWD | Three pads at the Pico's tail, on the left end | Reachable with the base removed. |

GPIO budget: the display uses GP10 to GP18 ([glyf.md](../docs/glyf.md)). That leaves 17 GPIOs: GP0 to GP9, GP19 to GP22, and GP26 to GP28. The 15 switches (8 secondary, 1 primary, 3 utility, 3 encoder push) fit a 4 × 4 diode matrix on 8 GPIOs. The three encoders use 6 more, 14 in total. Add the pin assignment to glyf.md when the board exists.

## Stack-up

Depth below the top face, in mm.

| Depth | What |
|------:|------|
| 0 | Top face, the datum for every height |
| 1.5 | Skin underside. The skin is the MX plate. |
| 1.8 | Screen glass, on the 0.3 mm gasket |
| 5.0 | Main PCB top (MX standard) |
| 6.6 | Main PCB underside |
| 7.45 | Screen module back, header pins removed |
| 8.4 | Hot-swap sockets |
| 10.5 | Pico, lowest part |
| 11.0 | Split: top case above, base below (`split_z`) |

The base is a wedge: `front_h` 15.0 mm at the front, `back_h` 26.9 mm at the back, at `tilt` 5°. The split is below the USB-C opening, so the whole opening is in the top case back wall.

## Enclosure

- **Top case:** one part. The skin is `top_t` thick and the walls are `wall_t` thick, down to `split_z`. It has the window, the MX cutouts, the primary well, the encoder holes (`enc_hole_d`), and the utility slots. Six bosses take M2.5 heat-set inserts: four at `boss_inset` from the corners, and two at `boss_mid_x` on the front and back edges.
- **Base:** a wedge with a `floor_t` floor. It holds a 3 mm stainless steel weight plate (about 360 g) so that the dial can spin without the pad sliding. The plate is centered in X and sits 10 mm from the back edge. Near the front edge the base is too shallow for it. Four silicone feet. Six M2.5 countersunk screws go up into the top case.
- **Edges:** `edge_chamfer` on the top perimeter, `win_chamfer` on the window, `pri_well_chamfer` on the primary well. Cut all three after anodizing so they show bright aluminium.

## Color, material, finish

| Part | Material | Finish | Color |
|------|----------|--------|-------|
| Top case | 6061-T6, CNC | Fine bead blast, type II anodize | Graphite |
| Chamfers | — | Diamond-cut after anodize | Bright aluminium |
| Base | 6061-T6, or PETG for prototypes | Bead blast, anodize | Graphite |
| Primary cap | PBT | Doubleshot or dye-sub | Green |
| Secondary caps | PBT | Textured | Light gray |
| Utility caps | 6061 | Anodize, laser etch | Graphite |
| Knobs | 6061 | Bead blast, clear anodize, straight knurl | Natural aluminium |
| Feet | Silicone | — | Black |

The green on the Paper board is the Macro Eleven `--primary` (`oklch(0.7 0.15 162)` in the dark theme). The Glyf app's `--primary` is violet (`oklch(0.72 0.2 270)`). Decide the brand color before you order caps. Match the cap to a physical sample, not to a screen.

## Tolerances

| Feature | Value |
|---------|-------|
| MX cutout | 14.00 +0.05/−0.00 machined. Add 0.1 for a printed part. |
| Window | ±0.05 |
| Knob skirt to top face | `knob_gap` 0.5 |
| Primary cap to well wall | 2.0 per side |
| Primary switch hole | `pri_sw_cut` 15.0. The switch housing must not touch it. |
| Utility cap to slot | `util_clr` 0.15 per side. Add 0.1 for a printed part. |
| Minimum space between controls | 6.0 |

## Model in Fusion 360

1. **Parameters.** Run the script (see above).
2. **Components.** Create these empty components first, and activate each one before you model it: Top Case, Base, Main PCB, Screen Module, Pico, Switches, Caps, Knobs, Encoders, Weight, Feet.
3. **Vendor models.** Insert the Raspberry Pi Pico STEP from Raspberry Pi, the MX switch from Cherry, the EC11 from Alps Alpine, and the Kailh MX hot-swap socket. Take the USB-C receptacle model from its maker. The screen module has no STEP: model it from the `scr_*` parameters.
4. **Skeleton sketch.** In the root component, sketch "Plan" on the XY plane. Draw the case outline, the window, and a point at each control center. Place the keys with a rectangular pattern, `key_cols` × `key_rows` at `key_pitch`. Every feature references this sketch. Do not dimension features to each other.
5. **Top case.** Extrude the outline from 0 to −`top_t` for the skin. Offset the outline by −`wall_t`, and extrude the ring from −`top_t` to −`split_z` for the walls. Join the two.
6. **Top case cuts.** Cut the window (`scr_tp_w` × `scr_tp_d`, R `win_r`). Cut the MX pattern (`mx_cut`). Pocket the primary well (`pri_well`, R `pri_well_r`, `pri_well_depth` deep), then cut its switch hole (`pri_sw_cut`, not `mx_cut`). Cut the encoder holes (`enc_hole_d`) and the utility slots (`util_w` + 2 × `util_clr`) at `util_y`.
7. **Top case details.** Add the six case bosses (`boss_d`, `insert_hole_d`), the four screen bosses (`scr_boss_h`), and the PCB standoffs (`pcb_standoff_h`). Cut the USB-C opening and the overmold cut (`usbc_cut_w` × `usbc_cut_h` at `usbc_x`, `usbc_z`). Add the chamfers last.
8. **Base.** Extrude the outline from −`split_z` down past −`back_h`. On the YZ plane, sketch the desk line from (y = −`case_d`, z = −`front_h`) to (y = 0, z = −`back_h`), and use it with Split Body. Delete the lower part. Shell the base from the split face. Add the weight pocket, the feet recesses, the BOOTSEL pinhole, and the countersunk screw holes.
9. **Main PCB.** Sketch the L-shaped outline: the inner wall offset by 0.5, minus the module footprint plus 1.5. Extrude `pcb_t` at −`mx_plate_to_pcb`. Save the sketch as DXF for the PCB tool's board outline.
10. **Knobs and caps.** Revolve the knob profiles. Cut the knurl with a circular pattern of small grooves; set Compute Option to Identical to keep the timeline fast. Cut the dial dimple with a sphere. Model the primary cap with a spherical dish and the secondaries with a cylindrical dish, or insert vendor caps.
11. **Joints.** Revolute joints for the knobs. Slider joints for the keys, 4.0 mm travel for MX.
12. **Check.** Run Inspect > Interference on all components. Add section analyses at x = `ctl_b_x` (161, through the USB-C, encoder 2, the Pico, Layers, and the dial) and at y = `pri_y` (101.32, through the key block, the primary key, and the dial). The Paper board draws both as sections A–A and B–B. Measure the clearance table above.
13. **Export.** STEP for the machined parts, 3MF for printed prototypes.

## Verify before you cut metal

- `scr_t`: measure the module with calipers. The MSP4021 drawing gives 5.65 mm without the header.
- `ec11_body_h`: check the chosen encoder. The skin hole must clear the body, and the knob skirt must cover the hole.
- `pico_h`: check against the Raspberry Pi STEP.
- `tact_h`: sets the utility plunger length.
- `pri_sw_cut`: fit a 5-pin switch in the hot-swap socket and check that it sits square without plate clips.
- `usbc_z`: set it from the footprint of the chosen receptacle.
