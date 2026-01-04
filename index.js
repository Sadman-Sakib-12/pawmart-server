const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require("dotenv").config()
const app = express()
const port = 3000
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
        // await client.connect();

        const db = client.db('model-db')
        const modelCollection = db.collection('models')
        const userCollection = db.collection('user')
        const orderCollection = db.collection('order')

       
        app.get('/models', async (req, res) => {

            const result = await modelCollection.find().toArray()

            res.send(result)
        })

        app.get('/latest-models', async (req, res) => {
            const result = await modelCollection.find().sort({ email: 'asc' }).limit(6).toArray()

            res.send(result)
        })

        app.get('/my-lisiting', async (req, res) => {
            const email = req.query.email
            const result = await modelCollection.find({ email: email }).toArray()
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



        app.post('/models', async (req, res) => {
            const data = req.body
            const result = await modelCollection.insertOne(data)
            // console.log(data)
            res.send({
                success: true,
                result
            })
        })

        app.post('/order/:id', async (req, res) => {
            const data = req.body
            const id = req.params.id
            const result = await orderCollection.insertOne(data)
        
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

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'User already exists', insertedId: null });
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        });

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            try {
                const user = await userCollection.findOne({ email });
                if (user) res.send(user);
                else res.status(404).send({ message: 'User not found' });
            } catch (err) {
                res.status(500).send({ error: 'Fetch failed' });
            }
        });

        app.patch('/users/:id', async (req, res) => {
            const id = req.params.id;
            const updateData = req.body;

            try {
                const result = await userCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updateData }
                );
                res.send(result);
            } catch (err) {
                res.status(500).send({ error: 'Update failed' });
            }
        });


        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;

            try {
                const result = await userCollection.deleteOne({ _id: new ObjectId(id) });
                res.send(result);
            } catch (err) {
                res.status(500).send({ error: 'Delete failed' });
            }
        });


        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });

        app.get('/overview', async (req, res) => {
            try {
                const totalListings = await modelCollection.countDocuments();
                const totalOrders = await orderCollection.countDocuments();


                const revenueAgg = await orderCollection.aggregate([
                    { $group: { _id: null, totalRevenue: { $sum: { $toDouble: { $ifNull: ["$price", 0] } } } } }
                ]).toArray();
                const totalRevenue = revenueAgg[0]?.totalRevenue || 0;


                const ordersByMonthAgg = await orderCollection.aggregate([
                    {
                        $project: {
                            month: { $month: { $toDate: { $ifNull: ["$createdAt", new Date()] } } }
                        }
                    },
                    { $group: { _id: "$month", count: { $sum: 1 } } },
                    { $sort: { "_id": 1 } }
                ]).toArray();

                const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const chartData = new Array(12).fill(0);
                ordersByMonthAgg.forEach(item => {
                    if (item._id >= 1 && item._id <= 12) chartData[item._id - 1] = item.count;
                });


                const listingsByCategoryAgg = await modelCollection.aggregate([
                    { $group: { _id: { $ifNull: ["$category", "Uncategorized"] }, count: { $sum: 1 } } }
                ]).toArray();

  
                const usersTable = await orderCollection.aggregate([
                    { $group: { _id: "$email", orders: { $sum: 1 } } },
                    { $project: { email: "$_id", orders: 1, _id: 0 } },
                    { $sort: { orders: -1 } },
                    { $limit: 5 }
                ]).toArray();

                res.send({
                    totalListings,
                    totalOrders,
                    revenue: totalRevenue.toFixed(2),
                    ordersByMonth: { labels: monthLabels, data: chartData },
                    listingsByCategory: {
                        labels: listingsByCategoryAgg.map(o => o._id),
                        data: listingsByCategoryAgg.map(o => o.count)
                    },
                    usersTable
                });
            } catch (err) {
                res.status(500).send({ error: "Data processing failed" });
            }
        });


        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);





app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
