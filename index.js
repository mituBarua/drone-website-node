const express = require("express");
const admin = require("firebase-admin");
const app = express();
const cors = require("cors");
const ObjectId = require("mongodb").ObjectId;
require("dotenv").config();
const { MongoClient } = require("mongodb");

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fsd1c.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } catch {}
  }
  next();
}
async function run() {
  try {
    await client.connect();
    const database = client.db("drone");
    const productsCollection = database.collection("products");
    const usersCollection = database.collection("users");
    const purchaseInfoCollection = database.collection("purchaseInfo");
    const productDetailsCollection = database.collection("ProductDetails");
    const reviewCollection = database.collection("review");

    //Get all strored products
    app.get("/allProducts", async (req, res) => {
      const result = await productsCollection.find({}).toArray();
      res.send(result);
    });

    //add a new product by admin
    app.post("/addProduct", async (req, res) => {
      const result = await productsCollection.insertOne(req.body);
      res.send(result);
    });
    app.delete("/deleteProduct/:id", async (req, res) => {
      const result = await productsCollection.deleteOne({
        _id: ObjectId(req.params.id),
      });
      res.send(result);
    });

    //get  allproduct details
    app.get("/productDetails", async (req, res) => {
      const result = await productDetailsCollection.find({}).toArray();
      res.send(result);
    });
    //get product with id
    app.get("/productDetails/:id", async (req, res) => {
      const id = req.params.id;
      const result = await productDetailsCollection.findOne({ id: id });
      res.send(result);
    });
    //   //add purchase info
    app.post("/purchaseInfo", async (req, res) => {
      const result = await purchaseInfoCollection.insertOne(req.body);
      res.send(result);
    });
    //   //get all purchase info
    app.get("/allPurchaseInfo", async (req, res) => {
      const result = await purchaseInfoCollection.find({}).toArray();
      res.send(result);
    });
    //my booking info
    app.get("/allPurchaseInfo/:email", async (req, res) => {
      const result = await purchaseInfoCollection
        .find({
          email: req.params.email,
        })
        .toArray();
      res.send(result);
    });
    //delete order from myorder
    app.delete("/deleteMyPurchase/:id", async (req, res) => {
      const result = await purchaseInfoCollection.deleteOne({
        _id: ObjectId(req.params.id),
      });
      res.send(result);
    });
    //delete  order list from all order
    app.delete("/deleteAllPurchase/:id", async (req, res) => {
      const result = await purchaseInfoCollection.deleteOne({
        _id: ObjectId(req.params.id),
      });
      res.send(result);
    });
    //change status pending to approved through put method
    app.put("/purchaseStatus/:id", async (req, res) => {
      const id = req.params.id;
      const result = await purchaseInfoCollection.findOne({
        _id: ObjectId(id),
      });

      let status = result.status == "Pending" ? "Shipped" : "Pending";

      const filter = { _id: ObjectId(id) };

      const options = { upsert: true };
      const updateDoc = {
        $set: {
          status: status,
        },
      };
      const result2 = await purchaseInfoCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result2);
    });
    // add review
    app.get("/review", async (req, res) => {
      const result = await reviewCollection.find({}).toArray();
      res.send(result);
    });

    //add a new review by user
    app.post("/addReview", async (req, res) => {
      const result = await reviewCollection.insertOne(req.body);
      res.send(result);
    });

    //save user to database
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      console.log(result);
      res.json(result);
    });
    //update user if its not in db
    app.put("/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = { $set: user };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.json(result);
    });
    //make admin to check email exist or not

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });
    //make admin
    app.put("/makeAdmin", verifyToken, async (req, res) => {
      const filter = { email: req.body.email };
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await usersCollection.findOne({
          email: requester,
        });
        if (requesterAccount.role === "admin") {
          const result = await usersCollection.find(filter).toArray();
          if (result) {
            const documents = await usersCollection.updateOne(filter, {
              $set: { role: "admin" },
            });
            res.send(documents);
          }
        } else {
          res
            .status(403)
            .json({ message: "you do not have access to make admin" });
        }
      }
    });
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Drone!!!!!!!!!");
});

app.listen(port, () => {
  console.log(`listening at ${port}`);
});
