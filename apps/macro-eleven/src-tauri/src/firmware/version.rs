use serde::{Serialize, Serializer};
use std::fmt;

/// Firmware semantic version (`major.minor.patch`), as reported by the device
/// and written to the bundled firmware manifest.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Version {
    pub major: u8,
    pub minor: u8,
    pub patch: u8,
}

impl Version {
    pub fn new(major: u8, minor: u8, patch: u8) -> Self {
        Self {
            major,
            minor,
            patch,
        }
    }

    pub fn parse(s: &str) -> Option<Self> {
        let mut parts = s.trim().split('.').map(|p| p.parse::<u8>().ok());
        let version = Self::new(parts.next()??, parts.next()??, parts.next()??);
        parts.next().is_none().then_some(version)
    }
}

impl fmt::Display for Version {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}.{}.{}", self.major, self.minor, self.patch)
    }
}

impl Serialize for Version {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.collect_str(self)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_and_displays() {
        let v = Version::parse("1.12.3").unwrap();
        assert_eq!(v, Version::new(1, 12, 3));
        assert_eq!(v.to_string(), "1.12.3");
    }

    #[test]
    fn rejects_malformed() {
        assert_eq!(Version::parse("1.2"), None);
        assert_eq!(Version::parse("1.2.3.4"), None);
        assert_eq!(Version::parse("1.x.3"), None);
        assert_eq!(Version::parse("1.2.256"), None);
    }

    #[test]
    fn orders_numerically() {
        assert!(Version::new(1, 10, 0) > Version::new(1, 9, 9));
        assert!(Version::new(2, 0, 0) > Version::new(1, 255, 255));
    }
}
