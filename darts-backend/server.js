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

const BASE = "https://api.github.com";
const FILE_PATH = "sessions/sessions_auto.json";
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
        const refData = await refRes.json();
        const baseSha = refData.object.sha;

        // 🔹 2. Create new branch
        const branchName = `session-${Date.now()}`;

        await github(`/repos/${REPO_OWNER}/${REPO_NAME}/git/refs`, {
            method: "POST",
            body: JSON.stringify({
                ref: `refs/heads/${branchName}`,
                sha: baseSha
            })
        });

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
        content.push(newSession);

        const updatedContent = Buffer.from(
            JSON.stringify(content, null, 2)
        ).toString("base64");

        // 🔹 5. Commit file to new branch
        await github(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
            method: "PUT",
            body: JSON.stringify({
                message: `Add darts session (${branchName})`,
                content: updatedContent,
                sha: sha,
                branch: branchName
            })
        });

        // 🔹 6. Create Pull Request
        const prRes = await github(`/repos/${REPO_OWNER}/${REPO_NAME}/pulls`, {
            method: "POST",
            body: JSON.stringify({
                title: "New darts session",
                head: branchName,
                base: BASE_BRANCH,
                body: "Automatically created session from darts app 🎯"
            })
        });

        const prData = await prRes.json();

        res.json({
            success: true,
            pr_url: prData.html_url
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create PR" });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});