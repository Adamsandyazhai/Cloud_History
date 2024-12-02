const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const firebaseAdmin = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

const serviceAccount = require("./serviceAccountKey.json");

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
});

const db = firebaseAdmin.firestore();

app.post("/api/nutrition", async (req, res) => {
  try {
    const data = req.body;
    const { uid, ...nutritionData } = data;

    if (!uid) {
      return res.status(400).json({ message: "UID is required" });
    }

    const user = await firebaseAdmin.auth().getUser(uid);
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found in Firebase Authentication" });
    }

    const entryId = uuidv4();

    await db
      .collection("nutritionFacts")
      .doc(uid)
      .collection("entries")
      .doc(entryId)
      .set({
        uid,
        ...nutritionData,
      });

    res.status(201).json({
      message: "Data berhasil disimpan",
      id: entryId,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/nutrition/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    const user = await firebaseAdmin.auth().getUser(uid);
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found in Firebase Authentication" });
    }

    const snapshot = await db
      .collection("nutritionFacts")
      .doc(uid)
      .collection("entries")
      .get();

    if (snapshot.empty) {
      return res
        .status(404)
        .json({ message: "Tidak ada data ditemukan untuk UID ini" });
    }

    const nutritionFacts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(nutritionFacts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
