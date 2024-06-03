const express = require('express')
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors')
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
        // await client.connect();



        const userCollection = client.db("uniqueTime").collection("user")

        app.post('/users', async (req, res) => {
            const user = req.body;
            // insert user's email if the email doesn't existing

            const query = {email: user.email}
            const existingUser = await userCollection.findOne(query)
            if(existingUser){
                return res.send({message: "The user is exist", insertedId: null})
            }

            const result = await userCollection.insertOne(user)
            res.send(result)
        })

        app.get('/users', async (req,res)=>{
            const result = await userCollection.find(req.body).toArray()
            res.send(result)
        })

        app.patch('/users/admin/:id', async(req,res)=>{
            const id = req.params.id;
            const filter = {_id: new ObjectId(id)}
            const updateDocs = {
                $set:{
                    role:"admin"
                }
            }
            const result = await userCollection.updateOne(filter, updateDocs)
            res.send(result)
        })

        app.delete('/users/:id', async (req, res)=>{
           const result = await userCollection.deleteOne({_id: new ObjectId(req.params.id)})
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