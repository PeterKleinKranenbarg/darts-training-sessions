import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const {
    GITHUB_TOKEN,
    REPO_OWNER,
    REPO_NAME
} = process.env;

function getTimestamp() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, "-");
}
const BASE = "https://api.github.com";
const timestamp = getTimestamp();
const FILE_PATH = `sessions/session_${timestamp}.json`;
const BASE_BRANCH = "main";

// helper
async function github(url, options = {}) {
    return fetch(`${BASE}${url}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            "Content-Type": "application/json",
            ...options.headers
        }
    });
}


app.post("/save-session", async (req, res) => {
    try {
        const newSession = req.body;

        // 🔹 1. Get latest commit SHA of main
        const refRes = await github(`/repos/${REPO_OWNER}/${REPO_NAME}/git/ref/heads/${BASE_BRANCH}`);

        if (!refRes.ok) {
            const err = await refRes.text();
            throw new Error("Failed to get base ref: " + err);
        }

        const refData = await refRes.json();
        const baseSha = refData.object.sha;

        // 🔹 2. Create new branch
        const branchName = `session-${Date.now()}`;

        const branchRes = await github(`/repos/${REPO_OWNER}/${REPO_NAME}/git/refs`, {
            method: "POST",
            body: JSON.stringify({
                ref: `refs/heads/${branchName}`,
                sha: baseSha
            })
        });

        if (!branchRes.ok) {
            const err = await branchRes.text();
            throw new Error("Failed to create branch: " + err);
        }

        // 🔹 3. Get current file content
        const fileRes = await github(
            `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${BASE_BRANCH}`
        );

        let content = [];
        let sha = null;

        if (fileRes.ok) {
            const fileData = await fileRes.json();
            sha = fileData.sha;

            const decoded = Buffer.from(fileData.content, "base64").toString();
            content = JSON.parse(decoded);
        }

        // 🔹 4. Append new session
        content.push(...newSession.trainings);

        const updatedContent = Buffer.from(
            JSON.stringify(content, null, 2)
        ).toString("base64");

        // 🔹 5. Commit file to new branch
        const body = {
            message: `Add darts session (${branchName})`,
            content: updatedContent,
            branch: branchName
        };

        if (sha) {
            body.sha = sha; // only include if file exists
        }

        const commitRes = await github(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
            method: "PUT",
            body: JSON.stringify(body)
        });

        if (!commitRes.ok) {
            const err = await commitRes.text();
            throw new Error("Failed to commit file: " + err);
        }

        // 🔹 6. Create Pull Request
        const timestamp = getTimestamp();
        const prTitle = `Darts session - ${timestamp}`;
        const prRes = await github(`/repos/${REPO_OWNER}/${REPO_NAME}/pulls`, {
            method: "POST",
            body: JSON.stringify({
                title: prTitle,
                head: branchName,
                base: BASE_BRANCH,
                body: "Automatically created session from darts app 🎯"
            })
        });

        if (!prRes.ok) {
            const err = await prRes.text();
            throw new Error("Failed to create PR: " + err);
        }

        const prData = await prRes.json();

        res.json({
            success: true,
            pr_url: prData.html_url,
            branch: branchName
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create PR" });
    }
});


app.get("/", (req, res) => {
    res.send("Darts backend is running 🎯");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server running on http://localhost:" + PORT);
});
