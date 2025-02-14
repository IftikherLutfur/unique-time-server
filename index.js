const express = require('express')
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_TOKEN)
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
    origin: ['http://localhost:5173', "https://unique-time.web.app"],
    credentials: true
}));
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



        const userCollection = client.db("uniqueTime").collection("user");
        const articleCollection = client.db("uniqueTime").collection("article");
        const publisherCollection = client.db("uniqueTime").collection('publishers')
        const premiumCollection = client.db("uniqueTime").collection('premium')
        const premiumCard = client.db("uniqueTime").collection('premiumCard')
        const cancelCollection = client.db("uniqueTime").collection('cancel')

        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.JSON_WEB_TOKEN, { expiresIn: '24h' })
            console.log(token);
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
            // console.log(token);
            jwt.verify(token, process.env.JSON_WEB_TOKEN, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorize access' })
                }
                req.decoded = decoded;
                next();
            })
        }
        //  Verify Admin
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query)
            const isAdmin = user?.role === "admin"
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
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


        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            // console.log(req.headers);
            const result = await userCollection.find(req.body).toArray()
            res.send(result)
        })
        app.get('/user', verifyToken, async (req, res) => {
            // console.log(req.headers);
            const result = await userCollection.find(req.body).toArray()
            res.send(result)
        })

        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email }
            const user = await userCollection.findOne(query)
            let admin = false;
            if (user) {
                admin = user.role === "admin"
            }
            res.send({ admin })
        })

        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
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

        // isPremium-Start
        const premiumVerify = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query)
            const isPremium = user?.isPremium === "yes"
            if (!isPremium) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        app.get('/premiumCard', verifyToken, premiumVerify, async (req, res) => {
            const result = await premiumCard.find().toArray()
            res.send(result)
        })
        app.get('/premiums/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await premiumCard.findOne(query)
            res.send(result)
        })

        app.get('/premiumCard/card/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: "forbidden access" })
            }
            const query = { email: email }
            const premium = await userCollection.findOne(query)
            let isPremium = false;
            if (premium) {
                isPremium = premium.isPremium === "yes"
            }
            res.send({ isPremium })
        })

        app.patch('/isPremium/update/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            console.log(email)
            const filter = { email: email }
            const updateDocs = {
                $set: {
                    isPremium: "yes"
                }
            }
            const result = await userCollection.updateOne(filter, updateDocs)
            res.send(result)
        })

        // isPremium-End

        app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const result = await userCollection.deleteOne({ _id: new ObjectId(req.params.id) })
            res.send(result)
        })


        // User Article add apis for user:

        app.post('/article', async (req, res) => {
            const body = req.body;
            const postResult = await articleCollection.insertOne(body)
            res.send(postResult)
        })

        app.get('/article/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await articleCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/article', async (req, res) => {
            try {
                const articles = await Article.find({ status: "published" })
                    .sort({ createdAt: -1 }); // Sorts latest articles first
                res.json(articles);
            } catch (error) {
                res.status(500).json({ message: "Error fetching articles", error });
            }
        });
        // Get article for the search
        // app.get('/article', async (req, res) => {
        //     const filter = req.query;
        //     console.log(filter);
        //     const query = {
        //         title: { $regex: filter.search, $options: 'i' }
        //     }
        //     const options = {
        //         sort: {
        //             price: filter.sort === "asc" ? 1 : -1
        //         }
        //     }
        //     const cursor = articleCollection.find(query, options)
        //     const result = await cursor.toArray()
        //     res.send(result)
        // })
        app.get('/article/get/:id', async (req, res) => {
            try {
                const id = req.params.id;
        
                // Check if id is a valid ObjectId
                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({ error: "Invalid article ID" });
                }
        
                const result = await articleCollection.findOne({ _id: new ObjectId(id) });
        
                if (!result) {
                    return res.status(404).json({ error: "Article not found" });
                }
        
                res.send(result);
            } catch (error) {
                console.error("Error fetching article:", error);
                res.status(500).json({ error: "Internal Server Error" });
            }
        });
        
        app.patch('/article/update/:email', async (req, res) => {
            const body = req.body;
            const email = req.params.email;
            const filter = { email: email }
            const updateDocs = {
                $set: {
                    title: body.title,
                    description: body.description,
                    image: body.image,
                    tag: body.tag
                }
            }
            const result = await articleCollection.updateOne(filter, updateDocs)
            res.send(result)
        })

        // Optional
        app.get('/article/:publisher', async (req, res) => {
            const publisher = req.params.publisher;
            const query = { publisher: new ObjectId(publisher) }
            const result = await articleCollection.find(query).toArray()
            res.send(result)
        })
        //  update  article only by Admin
        app.patch('/article/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDocs = {
                $set: {
                    status: 'published'
                }
            }
            const result = await articleCollection.updateOne(filter, updateDocs)
            res.send(result)
        })

        app.patch('/article/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDocs = {
                $set: {
                    status: "decline"
                }
            }
            const result = await articleCollection.updateOne(filter, updateDocs)
            res.send(result);
        })

        //     app.get('/articles/search',verifyToken, async (req, res) => {
        //   try {
        //     const { title, publisher, tags, status = 'approved' } = req.query; // default status to 'approved'
        //     let query = { status }; // ensure we are only fetching approved articles by default

        //     if (title) {
        //       query.title = { $regex: title, $options: 'i' };
        //     }

        //     if (publisher) {
        //       query.publisher = publisher;
        //     }

        //     if (tags) {
        //       query.tags = { $in: tags.split(",") }; 
        //     }

        //     const articles = await articlesCollection.find(query).toArray();
        //     res.send(articles);
        //   } catch (error) {
        //     console.error('Error filtering articles:', error);
        //     res.status(500).send({ message: 'Internal Server Error', error });
        //   }
        // });


        app.delete('/article/:id', async (req, res) => {
            const id = req.params.id;
            const result = await articleCollection.deleteOne({ _id: new ObjectId(id) })
            res.send(result)
        })

        // Add publisher by admin:
        app.post('/publisher', async (req, res) => {
            const publisher = req.body;
            const result = await publisherCollection.insertOne(publisher)
            res.send(result);
        })

        app.get('/publisher', async (req, res) => {
            const result = await publisherCollection.find().toArray();
            res.send(result);
        })

        // Premium Data
        app.get('/premium', async (req, res) => {
            const result = await premiumCollection.find().toArray();
            res.send(result)
        })

        app.get('/premium/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await premiumCollection.findOne(query)
            res.send(result)
        })

        // Payment GateWay Api:

        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = (price * 100)
            console.log(amount);

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ['card']
            })
            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })

        app.post('/cancel', async (req, res) => {
            const body = req.body;
            const result = await cancelCollection.insertOne(body);
            res.send(result);
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