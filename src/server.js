// Import necessary modules
import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import admin from "firebase-admin";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import PDFDocumentWithTables from "pdfkit-table";

// Import Firebase Firestore functions for database operations
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

// Handle ES module file path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Firebase configuration for the web app
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase app and Firestore database
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Define Firestore collection references
const lostItemsCollectionRef = collection(db, "lost_items");
const foundItemsCollectionRef = collection(db, "found_items");
const matchesCollectionRef = collection(db, "matches");
const archiveCollectionRef = collection(db, "archives");
const lostCounterRef = doc(db, "meta", "lostCounterRef");
const foundCounterRef = doc(db, "meta", "foundCounterRef");
const matchCounterRef = doc(db, "meta", "matchCounterRef");

// Function to apply filters to Firestore queries
const applyFilters = (collectionRef, filters) => {
  let q = query(collectionRef);

  // Apply date filter if provided
  if (filters.date && filters.dateField) {
    const startDate = new Date(filters.date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    // Convert to YYYY-MM-DD format since Firestore stores dates as strings
    const startDateString = startDate.toISOString().split("T")[0]; // "YYYY-MM-DD"
    const endDateString = endDate.toISOString().split("T")[0]; // "YYYY-MM-DD"

    q = query(
      q,
      where(filters.dateField, ">=", startDateString),
      where(filters.dateField, "<=", endDateString)
    );
  }

  // Apply category filter if provided
  if (filters.category) {
    q = query(q, where("category", "==", filters.category));
  }

  // Apply status filter if provided
  if (filters.status) {
    q = query(q, where("status", "==", filters.status));
  }

  // Apply sorting if provided
  if (filters.orderBy) {
    q = query(
      q,
      orderBy(
        filters.dateField || "date",
        filters.orderBy === "newest" ? "desc" : "asc"
      )
    );
  }
  return q;
};

// API Endpoint to fetch lost items
app.get("/api/lost-items", async (req, res) => {
  try {
    const q = applyFilters(lostItemsCollectionRef, {
      ...req.query,
      dateField: "dateLost",
    });
    const data = await getDocs(q);
    const lostItemsData = data.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    }));
    res.json(lostItemsData);
  } catch (err) {
    res.status(500).json({ error: "Error fetching lost items" });
  }
});

// API Endpoint to fetch found items
app.get("/api/found-items", async (req, res) => {
  try {
    const q = applyFilters(foundItemsCollectionRef, {
      ...req.query,
      dateField: "dateFound",
    });
    const data = await getDocs(q);
    const foundItemsData = data.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    }));
    res.json(foundItemsData);
  } catch (err) {
    res.status(500).json({ error: "Error fetching found items" });
  }
});

// API Endpoint to fetch matches
app.get("/api/matches", async (req, res) => {
  try {
    const q = applyFilters(matchesCollectionRef, {
      ...req.query,
      dateField: "matchTimestamp",
    });
    const data = await getDocs(q);
    const matchesData = data.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
    res.json(matchesData);
  } catch (err) {
    res.status(500).json({ error: "Error fetching matches" });
  }
});

// API Endpoint to fetch archives
app.get("/api/archives", async (req, res) => {
  try {
    const q = applyFilters(archiveCollectionRef, {
      ...req.query,
      dateField: "dateFound",
    });
    const data = await getDocs(q);
    const archivesData = data.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    }));
    res.json(archivesData);
  } catch (err) {
    res.status(500).json({ error: "Error fetching archives" });
  }
});

// API Endpoint to fetch statuses
app.get("/api/statuses", async (req, res) => {
  try {
    const statuses = ["Pending", "Matched"];
    res.json(statuses);
  } catch (err) {
    res.status(500).json({ error: "Error fetching statuses" });
  }
});

// API Endpoint to add a lost item
app.post("/api/lost-items", async (req, res) => {
  try {
    const lostCounterSnap = await getDoc(lostCounterRef);
    const currentCounter = lostCounterSnap.exists()
      ? lostCounterSnap.data().value
      : 0;
    const newLostID = `L${String(currentCounter + 1).padStart(4, "0")}`; // Generate the new document ID

    const newItem = {
      lostID: newLostID, // Ensure lostID matches the document ID
      ...req.body,
      status: "Pending",
      dateLost: req.body.dateLost || new Date().toISOString().split("T")[0],
      photoURL: req.body.photoURL || "",
    };

    // Use setDoc with a custom document ID (newLostID)
    const docRef = doc(lostItemsCollectionRef, newLostID);
    await setDoc(docRef, newItem);

    // Update the counter
    await setDoc(
      lostCounterRef,
      { value: currentCounter + 1 },
      { merge: true }
    );

    res.status(201).json({ id: newLostID, ...newItem });
  } catch (err) {
    res.status(500).json({ error: "Error adding lost item" });
  }
});

// API Endpoint to add a found item
app.post("/api/found-items", async (req, res) => {
  try {
    const foundCounterSnap = await getDoc(foundCounterRef);
    const currentCounter = foundCounterSnap.exists()
      ? foundCounterSnap.data().value
      : 0;
    const newFoundID = `F${String(currentCounter + 1).padStart(4, "0")}`; // Generate the new document ID

    const newItem = {
      foundID: newFoundID, // Ensure foundID matches the document ID
      ...req.body,
      status: "Pending",
      dateFound: req.body.dateFound || new Date().toISOString().split("T")[0],
      photoURL: req.body.photoURL || "", // Include the photoURL in the new item
    };

    // Use setDoc with a custom document ID (newFoundID)
    const docRef = doc(foundItemsCollectionRef, newFoundID);
    await setDoc(docRef, newItem);

    // Update the counter
    await setDoc(
      foundCounterRef,
      { value: currentCounter + 1 },
      { merge: true }
    );

    res.status(201).json({ id: newFoundID, ...newItem });
  } catch (err) {
    res.status(500).json({ error: "Error adding found item" });
  }
});

// API Endpoint to create a match between lost and found items
app.post("/api/matches", async (req, res) => {
  const matchCounterSnap = await getDoc(matchCounterRef);
  const currentCounter = matchCounterSnap.exists()
    ? matchCounterSnap.data().value
    : 0;
  const newMatchID = `M${String(currentCounter + 1).padStart(4, "0")}`; // Generate the new document ID

  try {
    const { lostDocId, foundDocId, lostID, foundID } = req.body;

    // Check if a match already exists
    const existingMatchQuery = query(
      matchesCollectionRef,
      where("lostDocId", "==", lostDocId),
      where("foundDocId", "==", foundDocId)
    );
    const existingMatchSnap = await getDocs(existingMatchQuery);

    if (!existingMatchSnap.empty) {
      return res.status(400).json({ error: "Match already exists" });
    }

    // Validate lost item
    const lostItemSnap = await getDoc(doc(db, "lost_items", lostDocId));
    if (!lostItemSnap.exists()) {
      return res.status(404).json({ error: "Lost item not found" });
    }
    const lostItemData = lostItemSnap.data();

    // Validate found item
    const foundItemSnap = await getDoc(doc(db, "found_items", foundDocId));
    if (!foundItemSnap.exists()) {
      return res.status(404).json({ error: "Found item not found" });
    }
    const foundItemData = foundItemSnap.data();

    // Create new match with newMatchID as the document ID
    const matchRef = doc(matchesCollectionRef, newMatchID);
    await setDoc(matchRef, {
      newMatchID,
      lostDocId,
      foundDocId,
      lostID,
      foundID,
      lostItem: lostItemData,
      foundItem: foundItemData,
      matchTimestamp: new Date().toISOString().split("T")[0],
    });

    // Update statuses of lost and found items
    await setDoc(
      doc(lostItemsCollectionRef, lostDocId),
      { status: "Matched" },
      { merge: true }
    );
    await setDoc(
      doc(foundItemsCollectionRef, foundDocId),
      { status: "Matched" },
      { merge: true }
    );

    // Update match counter
    await setDoc(matchCounterRef, { value: currentCounter + 1 });

    res.status(201).json({
      id: newMatchID,
      lostItem: lostItemData,
      foundItem: foundItemData,
      lostDocId,
      foundDocId,
    });
  } catch (err) {
    res.status(500).json({ error: "Error creating match" });
  }
});

// API Endpoint to send an email
app.get("/api/send-email", (req, res) => {
  res.send("Send a POST request to this endpoint with email data.");
});

// Function to send an email using Nodemailer
const sendEmail = async (req, res) => {
  const { to, subject, message } = req.body;

  // Skip email sending if the recipient email is "none"
  if (!to || to.toLowerCase() === "banana") {
    console.log("Email notification skipped.");
    return res
      .status(200)
      .json({ success: true, message: "Email notification skipped" });
  }

  if (!subject || !message) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: "lanzemmanuelle.magno.cics@ust.edu.ph",
        pass: "zvbc cvcu txyi libv", // ⚠️ Use environment variables instead.
      },
    });

    await transporter.sendMail({
      from: "lanzemmanuelle.magno.cics@ust.edu.ph",
      to,
      subject,
      html: `<h1>${message}</h1>`,
    });

    res.status(200).json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
};

// API route to send email
app.post("/api/send-email", sendEmail);

const moveOldItemToArchive = async (itemID, type) => {
  try {
    const sourceCollection = type === "lost" ? "lost_items" : "found_items";
    const docRef = doc(db, sourceCollection, itemID);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.log(`Item ${itemID} not found.`);
      return;
    }

    const itemData = docSnap.data();
    const archiveRef = doc(db, "archives", itemID);

    await setDoc(archiveRef, { ...itemData, status: "Archived" });
    await deleteDoc(docRef);

    console.log(`Item ${itemID} archived.`);
  } catch (error) {
    console.error("Error moving item to archive:", error);
  }
};

// API Endpoint to move an item to the archive
app.post("/api/moveItem/:id", async (req, res) => {
  const docId = req.params.id;
  const { claimedByID, claimedByName } = req.body; // Extract student details

  try {
    const sourceCollection = "found_items";
    const targetCollection = "archives";

    const docRef = doc(db, sourceCollection, docId);
    const docSnapshot = await getDoc(docRef);

    if (!docSnapshot.exists()) {
      return res
        .status(404)
        .json({ success: false, error: "Document not found" });
    }

    const docData = docSnapshot.data();

    // Add studentNumber and fullName to the new document
    const updatedDocData = {
      ...docData,
      claimedByID,
      claimedByName,
      status: "Claimed", // Update status to indicate it has been claimed
    };

    const targetDocRef = doc(db, targetCollection, docId);
    await setDoc(targetDocRef, updatedDocData);
    await deleteDoc(docRef);

    res.json({ success: true });
  } catch (error) {
    console.error("Error moving document:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/moveMatchItem/:id", async (req, res) => {
  const docId = req.params.id; // Match document ID
  const { claimedByID, claimedByName } = req.body;

  try {
    const matchRef = doc(db, "matches", docId);
    const matchSnapshot = await getDoc(matchRef);

    if (!matchSnapshot.exists()) {
      return res.status(404).json({ success: false, error: "Match not found" });
    }

    const matchData = matchSnapshot.data();
    console.log("Match Data:", matchData); // Debugging

    // Make sure to correctly extract the document IDs
    const lostDocID = matchData.lostDocId || matchData.lostID;
    const foundDocID = matchData.foundDocId || matchData.foundID;

    if (!lostDocID || !foundDocID) {
      return res
        .status(400)
        .json({ success: false, error: "Missing associated item IDs" });
    }

    // Define references
    const lostItemRef = doc(db, "lost_items", lostDocID);
    const foundItemRef = doc(db, "found_items", foundDocID);
    const archiveCollection = "archives";

    const lostItemSnapshot = await getDoc(lostItemRef);
    const foundItemSnapshot = await getDoc(foundItemRef);

    if (!lostItemSnapshot.exists() || !foundItemSnapshot.exists()) {
      return res
        .status(404)
        .json({ success: false, error: "One or both items not found" });
    }

    const lostItemData = lostItemSnapshot.data();
    const foundItemData = foundItemSnapshot.data();

    // Prepare updated data with claimer info
    const updatedLostItem = {
      ...lostItemData,
      claimedByID,
      claimedByName,
      status: "Claimed",
    };

    const updatedFoundItem = {
      ...foundItemData,
      claimedByID,
      claimedByName,
      status: "Claimed",
    };

    // Move both items to archive
    //await setDoc(doc(db, archiveCollection, lostDocID), updatedLostItem);
    await setDoc(doc(db, archiveCollection, foundDocID), updatedFoundItem);

    // Delete from original collections
    await deleteDoc(lostItemRef);
    await deleteDoc(foundItemRef);
    await deleteDoc(matchRef); // Remove match entry

    res.json({ success: true });
  } catch (error) {
    console.error("Error moving match items:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API Endpoint to cancel a match
app.delete("/api/cancelMatch/:matchId", async (req, res) => {
  const matchId = req.params.matchId;
  try {
    const matchRef = doc(db, "matches", matchId);
    const matchSnapshot = await getDoc(matchRef);

    if (!matchSnapshot.exists()) {
      return res.status(404).json({ error: "Match not found" });
    }

    const matchData = matchSnapshot.data();
    const { lostDocId, foundDocId } = matchData;

    // Update the status of the matched items back to "Pending"
    await setDoc(
      doc(db, "lost_items", lostDocId),
      { status: "Pending" },
      { merge: true }
    );
    await setDoc(
      doc(db, "found_items", foundDocId),
      { status: "Pending" },
      { merge: true }
    );

    await deleteDoc(matchRef);

    res.json({ success: true, message: "Match cancelled successfully" });
  } catch (err) {
    console.error("Error cancelling match:", err);
    res.status(500).json({ error: "Failed to cancel match" });
  }
});

const checkAndMoveOldItems = async () => {
  try {
    const now = new Date();
    now.setMonth(now.getMonth() - 6); // 6 months ago

    // Fetch lost items older than 6 months
    const lostQuery = query(
      lostItemsCollectionRef,
      where("dateLost", "<", now.toISOString().split("T")[0])
    );
    const lostItems = await getDocs(lostQuery);

    lostItems.forEach(async (docSnap) => {
      const item = docSnap.data();
      console.log(`Archiving Lost Item: ${item.lostID}`);
      await moveOldItemToArchive(item.lostID, "lost");
    });

    // Fetch found items older than 6 months
    const foundQuery = query(
      foundItemsCollectionRef,
      where("dateFound", "<", now.toISOString().split("T")[0])
    );
    const foundItems = await getDocs(foundQuery);

    foundItems.forEach(async (docSnap) => {
      const item = docSnap.data();
      console.log(`Archiving Found Item: ${item.foundID}`);
      await moveOldItemToArchive(item.foundID, "found");
    });
  } catch (error) {
    console.error("Error checking and moving old items:", error);
  }
};

// Run the function immediately on startup
console.log("Running initial archive check...");
checkAndMoveOldItems();

// Schedule it to run every 24 hours
setInterval(
  () => {
    console.log("Running scheduled archive check...");
    checkAndMoveOldItems();
  },
  24 * 60 * 60 * 1000
); // 24 hours in milliseconds

// API Endpoint to search found items by category
app.get("/api/found-items/category", async (req, res) => {
  try {
    const { category } = req.query;

    if (!category) {
      return res.status(400).json({ error: "Category is required" });
    }

    const q = query(
      foundItemsCollectionRef,
      where("category", "==", category.trim()),
      where("department", "==", "SHS")
    );
    const querySnapshot = await getDocs(q);

    res.json({ count: querySnapshot.size });
  } catch (err) {
    console.error("Error fetching found items:", err);
    res.status(500).json({ error: "Error fetching found items by category" });
  }
});

// API Endpoint to store user data
app.post("/api/users", async (req, res) => {
  try {
    const { uid, email, fullName, photoURL } = req.body;

    const userRef = doc(db, "users", email); // Use email as the document ID
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      await setDoc(userRef, {
        uid,
        email,
        fullName,
        photoURL,
        createdAt: new Date().toISOString().split("T")[0],
      });
    }

    res.status(200).json({ message: "User stored successfully" });
  } catch (error) {
    console.error("Error saving user:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
});

app.get("/api/users/name/:fullName", async (req, res) => {
  try {
    const { fullName } = req.params;
    const usersRef = collection(db, "users");

    // Query users where fullName matches
    const q = query(usersRef, where("fullName", "==", fullName));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return res
        .status(404)
        .json({ exists: false, message: "User not found." });
    }

    // Get the first matching user
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    res.status(200).json({
      exists: true,
      data: {
        fullName: userData.fullName,
        employeeNumber: userData.employeeNumber || userData.studentNumber || "",
      },
    });
  } catch (error) {
    console.error("Error fetching user by name:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
});

// Check if user exists by uid
app.get("/api/users/:uid", async (req, res) => {
  try {
    const userRef = doc(db, "users", req.params.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      res.json({ exists: true, data: userDoc.data() });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
});

// Check if user exists by email
app.get("/api/users/email/:email", async (req, res) => {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", req.params.email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      res.json({ exists: true, data: userData });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    console.error("Error fetching user by email:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
});

app.put("/api/users/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const {
      gradeLevel,
      studentNumber,
      strand,
      affiliation,
      employeeNumber,
      role,
    } = req.body;

    const userRef = doc(db, "users", email);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return res.status(404).json({ error: "User not found" });
    }

    // Determine the role and update fields accordingly
    const updateData =
      role === "faculty"
        ? { affiliation, employeeNumber, role }
        : { gradeLevel, studentNumber, strand, role: "student" };

    await updateDoc(userRef, updateData);

    res.status(200).json({ message: "User profile updated successfully" });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
});

// API to fetch user profile from Firestore using email
app.get("/api/users/email/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const usersRef = db.collection("users");
    const querySnapshot = await usersRef.where("email", "==", email).get();

    if (querySnapshot.empty) {
      return res.status(404).json({ error: "User not found" });
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    console.log("Fetched user data:", userData);

    if (!userData.role) {
      console.warn("⚠️ Warning: User document does not have a 'role' field.");
    }

    res.status(200).json(userData);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
});

// API Endpoint to add admin
app.post("/api/add-admin", async (req, res) => {
  try {
    const { fullName, email, employeeNumber, role } = req.body;

    if (!fullName || !email || !employeeNumber || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const userRef = doc(db, "users", email);

    const newAdmin = {
      fullName,
      email,
      employeeNumber,
      role,
      createdAt: new Date().toISOString().split("T")[0],
    };

    await setDoc(userRef, newAdmin);

    res.status(201).json({ id: email, ...newAdmin });
  } catch (error) {
    console.error("Error adding admin:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// API Endpoint to fetch admin users
app.get("/api/admins", async (req, res) => {
  try {
    const usersRef = collection(db, "users");
    const q = query(
      usersRef,
      where("role", "in", ["Support Staff", "Super Admin"])
    );
    const querySnapshot = await getDocs(q);

    const admins = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(admins);
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update an admin's role
app.put("/api/admins/:id", async (req, res) => {
  try {
    const { role } = req.body;
    const adminRef = doc(db, "users", req.params.id);
    await updateDoc(adminRef, { role });
    res.status(200).json({ message: "Admin role updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error updating admin role" });
  }
});

// Delete an admin
app.delete("/api/admins/:id", async (req, res) => {
  try {
    const adminRef = doc(db, "users", req.params.id);
    await deleteDoc(adminRef);
    res.status(200).json({ message: "Admin deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting admin" });
  }
});

// API endpoint to fetch current  user's lost items
app.get("/api/items", async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  console.log("Fetching items for email:", email); // Log the email

  try {
    const itemsRef = collection(db, "lost_items");
    const q = query(itemsRef, where("notifEmail", "==", email));
    const itemsSnapshot = await getDocs(q);

    console.log("Number of items found:", itemsSnapshot.size); // Log the number of items

    const items = [];
    itemsSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log("Document data:", data); // Log each document
      items.push({
        lostID: data.lostID,
        lost_item_name: data.lost_item_name,
        category: data.category,
        dateLost: data.dateLost,
        status: data.status,
        locationLost: data.locationLost || "",
        lost_item_desc: data.lost_item_desc || "",
      });
    });

    res.json(items);
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

// Update item endpoint
app.put("/api/items/:lostID", async (req, res) => {
  try {
    const lostID = req.params.lostID;
    console.log("🔍 Searching for document with lostID:", lostID);

    // Query Firestore to find the document with this lostID
    const itemsRef = collection(db, "lost_items");
    const q = query(itemsRef, where("lostID", "==", lostID));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.error("❌ No document found with lostID:", lostID);
      return res.status(404).json({ error: "Item not found" });
    }

    // Firestore should return only one document, but we take the first match just in case
    const docSnap = querySnapshot.docs[0];
    const docID = docSnap.id; // Get actual Firestore document ID
    console.log("✅ Found document! Firestore ID:", docID);

    // Extract updated fields
    const { category, dateLost, locationLost, lost_item_desc, lost_item_name } =
      req.body;
    const updateData = {
      ...(category && { category }),
      ...(dateLost && { dateLost }),
      ...(locationLost && { locationLost }),
      ...(lost_item_desc && { lost_item_desc }),
      ...(lost_item_name && { lost_item_name: lost_item_name }),
    };

    // Perform update using the correct Firestore document ID
    const itemRef = doc(db, "lost_items", docID);
    await updateDoc(itemRef, updateData);

    console.log("✅ Item updated successfully:", updateData);
    res.status(200).json({ message: "Item updated successfully" });
  } catch (error) {
    console.error(
      "🔥 Error updating item in Firestore:",
      error.message || error
    );
    res.status(500).json({ error: "Error updating item in Firestore" });
  }
});

// API endpoint to delete lost item
app.delete("/api/items/:lostID", async (req, res) => {
  try {
    const lostID = req.params.lostID;
    console.log("🗑️ Deleting item with lostID:", lostID);

    // Query Firestore to find the document with this lostID
    const itemsRef = collection(db, "lost_items");
    const q = query(itemsRef, where("lostID", "==", lostID));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.error("❌ No document found with lostID:", lostID);
      return res.status(404).json({ error: "Item not found" }); // ✅ Prevent duplicate calls
    }

    // Get Firestore document ID
    const docSnap = querySnapshot.docs[0];
    const docID = docSnap.id;
    console.log("✅ Found document! Firestore ID:", docID);

    // Delete the document
    await deleteDoc(doc(db, "lost_items", docID));

    console.log("✅ Item deleted successfully");

    // ✅ Return success message BEFORE frontend retries the request
    return res.status(200).json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error(
      "🔥 Error deleting item in Firestore:",
      error.message || error
    );
    return res.status(500).json({ error: "Error deleting item in Firestore" });
  }
});

// API to Generate and Download PDF Report
app.post("/api/generate-pdf", async (req, res) => {
  const doc = new PDFDocumentWithTables({ margin: 30 });

  try {
    const { items } = req.body;

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="LostAndFound_Report.pdf"'
    );
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    // 🏫 Report Header
    doc.fontSize(18).text("UST-SHS Lost and Found Report", {
      align: "center",
      underline: true,
    });
    doc.moveDown(1.5);

    // 📝 Fetch and Format Found Items (Only SHS)
    const foundItemsSnapshot = await getDocs(
      query(foundItemsCollectionRef, where("department", "==", "SHS"))
    );

    if (!foundItemsSnapshot.empty) {
      doc.fontSize(14).text("FOUND ITEMS", { underline: true });
      doc.moveDown(0.5);

      const foundItems = foundItemsSnapshot.docs.map((docData) => {
        const data = docData.data();
        return [
          data.foundID,
          data.found_item_name,
          data.found_item_desc,
          data.dateFound,
          data.locationFound,
          `${data.foundByName} (ID: ${data.foundByID})`,
          data.status,
        ];
      });

      // ✅ Add table
      await doc.table(
        {
          title: "Found Items",
          headers: [
            "Found ID",
            "Item",
            "Description",
            "Date",
            "Location",
            "Found By",
            "Status",
          ],
          rows: foundItems,
        },
        { width: 500 }
      );
      doc.moveDown(1);
    }

    // 📝 Add Lost Items Table
    if (items.length > 0) {
      doc.fontSize(14).text("LOST ITEMS", { underline: true });
      doc.moveDown(0.5);

      items.forEach((item) => {
        doc.fontSize(12).text(`Item ID: ${item.id}`);
        doc.moveDown(0.5);
      });

      doc.moveDown(3); // Space before QR codes

      // 📌 Display QR Codes Below the Table in a Grid (3 per row)
      let startX = 50;
      let startY = doc.y;
      const qrSize = 100;

      items.forEach((item, index) => {
        if (item.qrCode) {
          const qrImage = Buffer.from(item.qrCode.split(",")[1], "base64");
          doc.image(qrImage, startX, startY, { width: qrSize, height: qrSize });

          startX += 150; // Move right for next QR

          // If third QR, reset X and move down for new row
          if ((index + 1) % 3 === 0) {
            startX = 50;
            startY += qrSize + 20; // Adjust spacing
          }
        }
      });
    } else {
      doc.fontSize(12).text("No lost items found.");
    }
  } catch (error) {
    console.error("❌ Error generating PDF:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  } finally {
    doc.end(); // ✅ Ensures PDF stream is finalized
  }
});

// API to fetch user profile from Firestore using either student or employee number
app.get("/api/users/id/:idNumber", async (req, res) => {
  try {
    const { idNumber } = req.params;
    console.log("Looking up ID number:", idNumber);

    const usersRef = collection(db, "users");

    // First try to find by studentNumber
    let q = query(usersRef, where("studentNumber", "==", idNumber));
    let querySnapshot = await getDocs(q);

    // If not found, try by employeeNumber
    if (querySnapshot.empty) {
      q = query(usersRef, where("employeeNumber", "==", idNumber));
      querySnapshot = await getDocs(q);
    }

    // If still not found, return not found
    if (querySnapshot.empty) {
      console.log("No user found with ID number:", idNumber);
      return res.json({ exists: false });
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    console.log("Fetched user data:", userData);

    res.json({ exists: true, data: userData });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`); // Log the server start
});
