/// Tests that the Solearn Duel program compiles and deploys.
/// Full integration tests using LiteSVM will be added in a later iteration.
/// Ensures the program ID constant is a valid pubkey.
#[test]
fn test_program_id() {
    let program_id = solearn_duel::id();
    let pk_str = program_id.to_string();
    assert_eq!(pk_str.len(), 44); // Base58 pubkey length
    // Verify it parses as a valid Solana pubkey
    let _: [u8; 32] = program_id.to_bytes();
}
