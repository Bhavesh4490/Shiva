const multer=require("multer");
const pdfParse=require("pdf-parse");

const upload=multer({
storage:multer.memoryStorage()
});

let uploadedPDFText = "";
let pdfName = "";
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const Groq = require("groq-sdk");


dotenv.config();


const app = express();

app.use(cors());
app.use(express.json());


const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});



app.get("/",(req,res)=>{
    res.send("Shiva AI Server Running ✅");
});


app.post(
"/upload-pdf",
upload.single("pdf"),
async(req,res)=>{


try{

if(!req.file){
return res.status(400).json({
message:"No PDF received"
});
}


const data =
await pdfParse(req.file.buffer);



uploadedPDFText =
data.text;


pdfName =
req.file.originalname;



console.log(
"PDF Loaded:",
pdfName,
"Characters:",
uploadedPDFText.length
);



res.json({

message:
`PDF "${pdfName}" uploaded. You can ask questions about it.`,

pages:data.numpages

});


}

catch(error){

console.log(error);

res.status(500).json({

message:"PDF processing failed"

});

}

});
app.post("/chat", async(req,res)=>{

try{

const message=req.body.message;


const completion =
await groq.chat.completions.create({

messages:[

{
role:"system",
content:`
You are Shiva AI.

Answer like ChatGPT:
- Use headings
- Use bullet points
- Give examples
- Keep answers interactive
- Use markdown formatting
`
},

{
role:"user",
content:

`
You are Shiva AI, owner assistant of BOOKStore.

Answer according to:
1. Uploaded PDF knowledge
2. BOOKStore database
3. General knowledge

If information exists in PDF, prioritize it.

PDF CONTENT:

${uploadedPDFText ? uploadedPDFText : "No PDF uploaded"}

USER QUESTION:

${message}

Rules:
- Use headings
- Use bullet points
- Give examples
- Be friendly
- Answer like BOOKStore owner when questions are about books/courses.
`
}

],


model:"llama-3.3-70b-versatile",

stream:true

});



res.setHeader(
"Content-Type",
"text/plain; charset=utf-8"
);


for await(
const chunk of completion
){

const text =
chunk.choices[0]?.delta?.content || "";


res.write(text);

}


res.end();


}

catch(error){

console.log(error);

res.status(500)
.end(
"AI Error: "+error.message
);


}
console.log(
"PDF characters available:",
uploadedPDFText.length
);

console.log(
"Question:",
message
);

});



app.listen(3000,()=>{

console.log(
"🚀 Shiva AI running on port 3000"
);

});
