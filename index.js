const express = require('express')
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.hyx8zzc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)



        const userCollection = client.db("uniqueTime").collection("user")

        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.JSON_WEB_TOKEN, { expiresIn: '24h' })
            // console.log(token);
            res.send({ token })
        })

        // middleware
        const verifyToken = (req, res, next) => {
            // console.log("inside verifyToken", req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorize access' })
            }
            const token = req.headers.authorization.split(' ')[1]
            console.log(token);
            jwt.verify(token, process.env.JSON_WEB_TOKEN, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorize access' })
                }
                req.decoded = decoded;
                next();
            })
        }

        app.post('/users', async (req, res) => {
            const user = req.body;
            // insert user's email if the email doesn't existing

            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: "The user is exist", insertedId: null })
            }

            const result = await userCollection.insertOne(user)
            res.send(result)
        })


        app.get('/users', verifyToken, async (req, res) => {
            // console.log(req.headers);
            const result = await userCollection.find(req.body).toArray()
            res.send(result)
        })

        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                res.status(401).send({ message: 'unauthorize access' })
            }
            const query = { email: email }
            const user = await userCollection.findOne(query)
            let admin = false;
            if (user) {
                admin = user.role === "admin"
            }
            res.send({ admin })
        })

        app.patch('/users/admin/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDocs = {
                $set: {
                    role: "admin"
                }
            }
            const result = await userCollection.updateOne(filter, updateDocs)
            res.send(result)
        })

        app.delete('/users/:id', verifyToken, async (req, res) => {
            const result = await userCollection.deleteOne({ _id: new ObjectId(req.params.id) })
            res.send(result)
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error

    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("Unique Time on the work")
})
app.listen(port, () => {
    console.log(`server is on ${port}`);
})