import express from 'express'
import userRouter from './routes/routes';

const app = express();
app.use(express.json());

app.use("/user", userRouter);

app.listen(3005, () =>{
  console.log(`server is running on port: ${3005}`)
})