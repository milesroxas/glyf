fn main() {
    // Allow objc crate's deprecated feature="cargo-clippy" cfg (from sel_impl macro)
    println!("cargo::rustc-check-cfg=cfg(feature,values(\"cargo-clippy\"))");
    tauri_build::build()
}
