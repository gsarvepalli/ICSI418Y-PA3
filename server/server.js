require("dotenv").config();

const { MongoClient, ObjectId } = require("mongodb");
const client = new MongoClient(process.env.MONGO_URI);

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 9000; 

app.use(express.json());
app.use(cors());

let users;
let projects;
let projectMemberships; 

const VALID_STATUSES = ["Planning", "Active", "Completed"]; 

function isValidId(id) {
    return (
        typeof id === "string" &&
        ObjectId.isValid(id) &&
        new ObjectId(id).toString() === id
    );
}

function publicUser(user) {
    return {
        _id: user._id,
        username: user.username
    }; 
}

async function connectDatabase() {
    await client.connect();

    const db = client.db("pa3");

    users = db.collection("users");
    projects = db.collection("projects");
    projectMemberships = db.collection("projectMemberships");

    await projectMemberships.createIndex(
        { project_id: 1, user_id: 1 },
        { unique: true }
    );

    console.log("Connected to MongoDB");
}


app.get("/", (req, res) => {
    res.json({
        message: "Server is running"
    });
});

app.post("/signup", async(req, res) => {
    try {
        const{username, password} = req.body;

        if(!username || !password) {
            return res.status(400).json({message: "Username and password required"});
        }

        const existingUser = await users.findOne({username});

        if(existingUser) {
            return res.status(409).json({message: "Username already exists"});
        }

        await users.insertOne({
            username: username,
            password: password
        });

        res.status(201).json({message: "User created successfully"});
    } catch (error) {
        console.error(error);

        res.status(500).json({message: "Server error"});
    }
});

app.post("/login", async(req, res) => {
    try {
        const{username, password} = req.body;

        if(!username || !password) {
            return res.status(400).json({message: "Username and password required"});
        }

        const user = await users.findOne({username});

        if(!user || user.password != password) {
            return res.status(401).json({message: "Invalid username or password"});
        }
        res.status(200).json({message: "Login successful"});
    } catch (error) {
        console.error(error);

        res.status(500).json({message: "Server error"});
    }
});

app.get("/users", async (req, res) => {
    try {
        const allUsers = await users.find(
            {},
            { projection: { username: 1 } }
        ).toArray();

        res.json(allUsers.map(publicUser));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Could not retrieve users" });
    }
});

app.post("/projects", async (req, res) => {
    let createdProjectId;

    try {
        const { name, description, status, project_lead_id } = req.body;

        if (
            typeof name !== "string" || !name.trim() ||
            typeof description !== "string" || !description.trim() ||
            !VALID_STATUSES.includes(status) ||
            !isValidId(project_lead_id)
        ) {
            return res.status(400).json({
                message: "Provide a project name, description, valid status, and valid Project Lead."
            });
        }

        const lead = await users.findOne({
            _id: new ObjectId(project_lead_id)
        });

        if (!lead) {
            return res.status(404).json({
                message: "Selected Project Lead does not exist"
            });
        }

        const project = {
            name: name.trim(),
            description: description.trim(),
            status,
            project_lead_id: lead._id
        };

        const result = await projects.insertOne(project);
        createdProjectId = result.insertedId;

        try {
            await projectMemberships.insertOne({
                project_id: createdProjectId,
                user_id: lead._id
            });
        } catch (error) {
            await projects.deleteOne({ _id: createdProjectId });
            throw error;
        }

        res.status(201).json({
            message: "Project created successfully",
            project: { _id: createdProjectId, ...project }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Could not create project"
        });
    }
});

app.get("/projects", async (req, res) => {
    try {
        const allProjects = await projects.find({}).toArray();

        const result = await Promise.all(
            allProjects.map(async (project) => {
                const lead = await users.findOne(
                    { _id: project.project_lead_id },
                    { projection: { username: 1 } }
                );

                return {
                    ...project,
                    project_lead: lead ? publicUser(lead) : null
                };
            })
        );

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Could not retrieve projects"
        });
    }
});

app.get("/projects/:id/members", async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: "Invalid project ID"
            });
        }

        const project = await projects.findOne({
            _id: new ObjectId(id)
        });

        if (!project) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        const memberships = await projectMemberships.find({
            project_id: project._id
        }).toArray();

        const members = await Promise.all(
            memberships.map(async (membership) => {
                const user = await users.findOne({
                    _id: membership.user_id
                });

                if (!user) return null;

                return {
                    ...publicUser(user),
                    isLead: user._id.equals(project.project_lead_id)
                };
            })
        );

        res.json(members.filter(Boolean));
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Could not retrieve project members"
        });
    }
});

app.post("/projects/:id/members", async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;

        if (!isValidId(id) || !isValidId(user_id)) {
            return res.status(400).json({
                message: "Valid project ID and user ID are required"
            });
        }

        const project = await projects.findOne({
            _id: new ObjectId(id)
        });

        if (!project) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        const user = await users.findOne({
            _id: new ObjectId(user_id)
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const membership = {
            project_id: project._id,
            user_id: user._id
        };

        try {
            await projectMemberships.insertOne(membership);
        } catch (error) {
            if (error.code === 11000) {
                return res.status(409).json({
                    message: "This user is already a member of the project"
                });
            }
            throw error;
        }

        res.status(201).json({
            message: "Member added successfully"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Could not add project member"
        });
    }
});

app.delete(
    "/projects/:id/members/:userId",
    async (req, res) => {
        try {
            const { id, userId } = req.params;

            if (!isValidId(id) || !isValidId(userId)) {
                return res.status(400).json({
                    message: "Invalid project ID or user ID"
                });
            }

            const project = await projects.findOne({
                _id: new ObjectId(id)
            });

            if (!project) {
                return res.status(404).json({
                    message: "Project not found"
                });
            }

            const memberId = new ObjectId(userId);

            if (project.project_lead_id.equals(memberId)) {
                return res.status(400).json({
                    message: "The Project Lead cannot be removed"
                });
            }

            const result = await projectMemberships.deleteOne({
                project_id: project._id,
                user_id: memberId
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    message: "Membership not found"
                });
            }

            res.json({
                message: "Member removed successfully"
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                message: "Could not remove project member"
            });
        }
    }
);

async function startServer() {
    try {
        await connectDatabase();

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Could not start server:", error);
        process.exit(1);
    }
}

startServer();
