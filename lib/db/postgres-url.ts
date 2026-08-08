const LEGACY_STRONG_SSL_MODES = /([?&])sslmode=(?:prefer|require|verify-ca)(?=&|$)/i;

/**
 * pg currently treats these SSL modes as certificate verification, but its
 * next major version will follow the weaker libpq meanings. Make the intended
 * verification explicit so upgrades cannot silently reduce transport safety.
 */
export function enforcePostgresCertificateVerification(connectionString: string) {
  return connectionString.replace(LEGACY_STRONG_SSL_MODES, "$1sslmode=verify-full");
}
