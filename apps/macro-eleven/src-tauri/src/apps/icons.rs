//! App icons as PNG files, rendered by AppKit.

use std::path::Path;

use objc2::rc::autoreleasepool;
use objc2::AllocAnyThread;
use objc2_app_kit::{
    NSBitmapImageFileType, NSBitmapImageRep, NSCompositingOperation, NSDeviceRGBColorSpace,
    NSGraphicsContext, NSImageInterpolation, NSWorkspace,
};
use objc2_foundation::{NSDictionary, NSPoint, NSRect, NSSize, NSString};

/// Render the Finder icon of `path` to a square PNG, `size` pixels wide.
pub fn render_png(path: &Path, size: u16) -> Option<Vec<u8>> {
    let path = NSString::from_str(path.to_str()?);
    autoreleasepool(|_| {
        let image = NSWorkspace::sharedWorkspace().iconForFile(&path);
        let pixels = size as isize;
        // SAFETY: null planes make AppKit allocate the buffer; the other
        // arguments describe 8-bit RGBA, which AppKit supports.
        let rep = unsafe {
            NSBitmapImageRep::initWithBitmapDataPlanes_pixelsWide_pixelsHigh_bitsPerSample_samplesPerPixel_hasAlpha_isPlanar_colorSpaceName_bytesPerRow_bitsPerPixel(
                NSBitmapImageRep::alloc(),
                std::ptr::null_mut(),
                pixels,
                pixels,
                8,
                4,
                true,
                false,
                NSDeviceRGBColorSpace,
                0,
                0,
            )
        }?;
        let context = NSGraphicsContext::graphicsContextWithBitmapImageRep(&rep)?;
        NSGraphicsContext::saveGraphicsState_class();
        NSGraphicsContext::setCurrentContext(Some(&context));
        context.setImageInterpolation(NSImageInterpolation::High);
        let side = f64::from(size);
        image.drawInRect_fromRect_operation_fraction(
            NSRect::new(NSPoint::ZERO, NSSize::new(side, side)),
            NSRect::ZERO,
            NSCompositingOperation::Copy,
            1.0,
        );
        context.flushGraphics();
        NSGraphicsContext::restoreGraphicsState_class();
        // SAFETY: an empty property dictionary is valid for PNG.
        let png = unsafe {
            rep.representationUsingType_properties(NSBitmapImageFileType::PNG, &NSDictionary::new())
        }?;
        Some(png.to_vec())
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn renders_a_png() {
        let png = render_png(Path::new("/System/Library/CoreServices/Finder.app"), 64).unwrap();
        assert_eq!(&png[..8], b"\x89PNG\r\n\x1a\n");
    }
}
