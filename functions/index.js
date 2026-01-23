
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {FieldValue} = require("firebase-admin/firestore");

admin.initializeApp();
const db = admin.firestore();

exports.processSignUp = functions.auth.user().onCreate(async (user) => {
  const {uid, email, displayName, photoURL} = user;
  
  const userRef = db.collection("users").doc(uid);
  
  await userRef.set({
    email,
    displayName: displayName || "New User",
    photoURL: photoURL || null,
    createdAt: FieldValue.serverTimestamp(),
    walletBalance: 0,
    kycStatus: "pending",
    isAdmin: false,
    role: "none",
  });

  // Check for referral
  // Note: This part of the function is not yet implemented.
  // We will need to add logic to handle referral codes if they exist.

  console.log(`User ${uid} successfully created.`);
  return null;
});


exports.deleteUserAccount = functions.https.onCall(async (data, context) => {
  // 1. Ensure the user is authenticated.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const uid = context.auth.uid;

  try {
    // 2. Delete user from Firebase Authentication
    await admin.auth().deleteUser(uid);

    // 3. Delete user's Firestore document
    await db.collection("users").doc(uid).delete();
    
    console.log(`Successfully deleted user ${uid}`);
    return {message: "Account deleted successfully."};
    
  } catch (error) {
    console.error("Error deleting user:", error);
    throw new functions.https.HttpsError(
      "internal",
      "An error occurred while trying to delete the user account."
    );
  }
});


/**
 * Set a user's custom role.
 *
 * @param {object} data - The data passed to the function.
 * @param {string} data.uid - The UID of the user to update.
 * @param {string} data.role - The new role to assign.
 * @param {object} context - The context of the function call.
 * @returns {Promise<object>} - A promise that resolves with a success or error message.
 */
exports.setRole = functions.https.onCall(async (data, context) => {
    // 1. Check for Super Admin privileges
    if (context.auth.token.role !== "superAdmin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "This function can only be called by a Super Admin."
      );
    }
  
    // 2. Validate input
    const {uid, role} = data;
    if (typeof uid !== "string" || typeof role !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "The 'uid' and 'role' must be non-empty strings."
      );
    }
    const allowedRoles = ["kycAdmin", "depositAdmin", "withdrawalAdmin", "matchAdmin", "superAdmin", "none"];
      if (!allowedRoles.includes(role)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          \`The 'role' must be one of the following: ${allowedRoles.join(", ")}\`
        );
      }
  
    // 3. Set Custom Claim & Firestore field
    try {
      // Set the custom claim. This is the source of truth for security rules.
      await admin.auth().setCustomUserClaims(uid, { role: role === 'none' ? null : role });
      
      // Update the user's document in Firestore for client-side rendering.
      await db.collection('users').doc(uid).update({ role: role });
  
      if (role !== 'none') {
        return { message: \`Success! User ${uid} has been made a ${role}.\` };
      } else {
        return { message: \`Success! User ${uid} has had their roles removed.\` };
      }
  
    } catch (error) {
      console.error("Error setting custom claims:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Unable to set custom claims."
      );
    }
  });

