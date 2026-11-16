import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import morgan from "morgan";

const app = express();
const port = Number(process.env.PORT) || 6500;
const logFile = fileURLToPath(new URL("./server.log", import.meta.url));

app.use(cors());
app.use(morgan("dev"));

const logger = (req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const period = Date.now() - start;
        const log = `${req.method} ${req.originalUrl} ${res.statusCode} - ${period}ms`;
        fs.appendFile(logFile, `${log}\n`, (err) => {
            if (err) {
                console.error("Failed to append request log:", err);
            }
        });
    });
    next();
};

app.use(logger);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const validatePatient = (req, res, next) => {
    const { name, age, word } = req.body ?? {};
    const parsedAge = typeof age === "number"
        ? age
        : typeof age === "string" && age.trim() !== ""
            ? Number(age)
            : Number.NaN;

    if (
        typeof name !== "string"
        || name.trim() === ""
        || !Number.isFinite(parsedAge)
        || parsedAge <= 0
        || typeof word !== "string"
        || word.trim() === ""
    ) {
        return res.status(400).json({ message: "Invalid patient data" });
    }

    next();
};

const validatePatientId = (req, res, next) => {
    const { id } = req.params;
    const patientId = Number(id);

    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(patientId)) {
        const err = new Error("Patient not found");
        err.statusCode = 404;
        return next(err);
    }

    next();
};

app.post("/api/v1/patients", validatePatient, (req, res) => {
    res.status(201).json({ message: "Patient created successfully" });
});

app.get("/api/v1/patients", (req, res) => {
    res.status(200).json({ message: "Patients fetched successfully" });
});

app.get("/api/v1/patients/:id", validatePatientId, (req, res) => {
    res.status(200).json({ message: "Patient details fetched successfully" });
});

app.put("/api/v1/patients/:id", validatePatientId, validatePatient, (req, res) => {
    res.status(200).json({ message: "Patient updated successfully" });
});

app.delete("/api/v1/patients/:id", validatePatientId, (req, res) => {
    res.status(200).json({ message: "Patient deleted successfully" });
});

app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    console.error(err.stack ?? err);
    const candidateStatus = err.statusCode ?? err.status;
    const statusCode = Number.isInteger(candidateStatus)
        && candidateStatus >= 400
        && candidateStatus <= 599
        ? candidateStatus
        : 500;
    const message = err.message || "Internal Server Error";
    res.status(statusCode).json({ message });
});

app.use((req, res) => {
    res.status(404).json({ message: "Resource not found" });
});

export default app;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
}
