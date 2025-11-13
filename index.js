const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require("dotenv").config()
const app = express()
const port = 3000
// password=// AQeLZnTa1EUqEp0W
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Hello World!')
})

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@sakib.xono2ll.mongodb.net/?appName=Sakib`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();

        const db = client.db('model-db')
        const modelCollection = db.collection('models')
        const orderCollection = db.collection('order')

        // find//
        // findone
        app.get('/models', async (req, res) => {

            const result = await modelCollection.find().toArray()
            console.log(result)
            res.send(result)
        })

        app.get('/latest-models', async (req, res) => {
            const result = await modelCollection.find().sort({ email: 'asc' }).limit(6).toArray()
            console.log(result)
            res.send(result)
        })

        app.get('/my-lisiting', async (req, res) => {
            const email = req.query.email
            const result = await modelCollection.find({ created_by: email }).toArray()
            res.send(
                {
                    success: true,
                    result
                })
        })
        app.put('/models/:id', async (req, res) => {
            const { id } = req.params
            const data = req.body
            const objectId = new ObjectId(id)
            const filter = { _id: objectId }
            const update = {
                $set: data
            }
            const result = await modelCollection.updateOne(filter, update)
            res.send({
                success: true,
                result
            })
        })
        app.delete('/models/:id', async (req, res) => {
            const { id } = req.params
            const objectId = new ObjectId(id)
            const result = await modelCollection.deleteOne({ _id: objectId })
            res.send({
                success: true,
                result
            })
        })


        app.get('/models/:id', async (req, res) => {
            const { id } = req.params
            console.log(id)
            const objectId = new ObjectId(id)
            const result = await modelCollection.findOne({ _id: objectId })
            res.send(
                {
                    success: true,
                    result
                }
            )
        })

        app.get('/category-filtered-product/:categoryName', async (req, res) => {
            const categoryName = req.params.categoryName
            const result = await modelCollection.find({ category: categoryName }).toArray()
            res.send(
                {
                    success: true,
                    result
                }
            )
        })


        // post method
        app.post('/models', async (req, res) => {
            const data = req.body
            const result = await modelCollection.insertOne(data)
            console.log(data)
            res.send({
                success: true,
                result
            })
        })

        app.post('/order/:id', async (req, res) => {
            const data = req.body
            const id = req.params.id
            const result = await orderCollection.insertOne(data)
            console.log(data)
            const filter = { _id: new ObjectId(id) }
            const update = {
                $inc: {
                    quantity: 1
                }
            }
            const counted = await modelCollection.updateOne(filter, update)
            res.send({
                success: true,
                result, counted
            })
        })

        app.get('/category-filter/:categoryName', async (req, res) => {
            const categoryName = req.params.categoryName
            const result = await modelCollection.find({ category: categoryName }).toArray()
            res.send({
                success: true,
                result
            })
        })
        app.get('/my-order', async (req, res) => {
            const email = req.query.email
            const result = await orderCollection.find({ email: email }).toArray()
            res.send(
                {
                    success: true,
                    result
                }
            )
        })

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);





app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
