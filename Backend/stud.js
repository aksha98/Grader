import fs from "fs";
import csv from "csv-parser";

const students = [];

fs.createReadStream("Students_Grading_Dataset.csv")
  .pipe(csv())
  .on("data", (row) => {
    students.push({ 
        studentID: row.Student_ID, // Using Student_ID as roll number
        name: row.First_Name + " " + row.Last_Name,
        department: row.Department,
        totalScore: parseFloat(row.Total_Score), // Convert to number
        grade: row.Grade,
     });
  })
  .on("end", () => {
    console.log("CSV file successfully processed!");
  });

export default students; // Export student data


