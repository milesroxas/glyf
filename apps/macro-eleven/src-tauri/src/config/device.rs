//! Physical layout of Macro Eleven, read from the shared device file so the
//! host, the designer, and validation agree on which keys exist.

use serde::Deserialize;
use std::sync::LazyLock;

use super::keymap::MatrixPosition;

const MACRO_ELEVEN_JSON: &str =
    include_str!("../../../../../shared/libs/keymap-schema/src/macro-eleven.device.json");

#[derive(Debug, Deserialize)]
struct Matrix {
    rows: u8,
    cols: u8,
}

#[derive(Debug, Deserialize)]
pub struct DeviceLayout {
    pub name: String,
    matrix: Matrix,
    /// Every physical key as `[row, col]`, in firmware bit order.
    keys: Vec<(u8, u8)>,
}

static MACRO_ELEVEN: LazyLock<DeviceLayout> = LazyLock::new(|| {
    serde_json::from_str(MACRO_ELEVEN_JSON).expect("bundled device layout is valid JSON")
});

pub fn macro_eleven() -> &'static DeviceLayout {
    &MACRO_ELEVEN
}

impl DeviceLayout {
    /// Matrix position of the key at firmware bit `index`.
    pub fn position(&self, index: usize) -> Option<MatrixPosition> {
        self.keys
            .get(index)
            .map(|&(row, col)| MatrixPosition::new(row, col))
    }

    /// Inside the matrix. Cells without a switch (Macro Eleven's [0,3])
    /// count: a key there never fires, but older keymaps that set one load.
    pub fn in_matrix(&self, pos: MatrixPosition) -> bool {
        pos.row < self.matrix.rows && pos.col < self.matrix.cols
    }

    /// "3 × 4", for messages.
    pub fn matrix_size(&self) -> String {
        format!("{} × {}", self.matrix.rows, self.matrix.cols)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::hid::protocol::KEY_COUNT;

    #[test]
    fn layout_matches_the_hid_report() {
        let layout = macro_eleven();
        assert!(layout.position(KEY_COUNT - 1).is_some());
        assert!(layout.position(KEY_COUNT).is_none());
        assert_eq!(layout.position(0), Some(MatrixPosition::new(0, 0)));
        assert_eq!(layout.position(3), Some(MatrixPosition::new(1, 0)));
        assert_eq!(layout.position(10), Some(MatrixPosition::new(2, 3)));
        assert!(layout.in_matrix(MatrixPosition::new(0, 3)), "the knob cell");
        assert!(!layout.in_matrix(MatrixPosition::new(3, 0)));
    }
}
