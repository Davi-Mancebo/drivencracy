import Joi from "joi";
import { ObjectId } from "mongodb";
import { CHOICES, POLLS, VOTES } from "./database.js";

export const postPoll = async (req, res) => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  const year = date.getFullYear();
  const month = (`0 ${date.getMonth() + 1}`).slice(-2);
  const day = (`0 ${date.getDate()}`).slice(-2);
  const hour = (`0 ${date.getHours() + 1}`).slice(-2);
  const minutes = (`0 ${date.getMinutes() + 1}`).slice(-2);
  const timeFinal = `${year}-${month}-${day} ${hour}:${minutes}`

  let expireAt = "";
  if (req.body?.expireAt) {
    expireAt = req.body?.expireAt;
  } else {
    expireAt = timeFinal;
  }

  const user = req.body;
  const userJoi = Joi.object({
    title: Joi.string().min(1).required(),
    expireAt: Joi.string(),
  });
  const validation = userJoi.validate(user);
  if (validation.error) {
    return res.status(422).send("Envie um titulo!");
  }

  await POLLS.insertOne({
    title: req.body?.title,
    expireAt: expireAt,
  });

  return res.sendStatus(201);
};

export const getPoll = async (req, res) => {
  const data = await POLLS.find().toArray();
  return res.send(data);
};

export const postChoice = async (req, res) => {
  if (req.body?.pollId.length != 24) return res.sendStatus(422);
  const body = req.body;
  const objectId = ObjectId(req.body?.pollId);
  const poll = await POLLS.findOne({ _id: objectId });
  if (!poll) {
    res.status(404).send("Poll Inexistente");
  }
  else{
    const today = Date.now()
    const date = new Date(poll?.expireAt).getTime();
    if(today > date) return res.sendStatus(403)
  }
  const joiObject = Joi.object({
    title: Joi.string().required(),
    pollId: Joi.string(),
  });
  const validation = joiObject.validate(body);

  const choices = await CHOICES.find({ pollId: objectId }).toArray();

  if (choices.find((element) => element.title === req.body.title))
    return res.sendStatus(409);

  if (validation.error) return res.sendStatus(422);

  await CHOICES.insertOne({
    title: body?.title,
    pollId: objectId,
  });
  return res.sendStatus(201);
};
export const getChoice = async (req, res) => {
  if (req.params.id.length != 24) return res.sendStatus(422);

  const objectId = ObjectId(req.params.id);
  const pollFind = await POLLS.findOne({ _id: objectId });

  if (!pollFind) return res.sendStatus(404);

  return res.send(await CHOICES.find({ pollId: objectId }).toArray());
};
export const vote = async (req, res) => {
  const date = new Date();
  if (req.params.id.length != 24) return res.status(422).send("id invalido!");

  const objectId = ObjectId(req.params.id);
  const choice = await CHOICES.findOne({ _id: objectId });

  if (!choice) {
    return res.status(404).send("id inexistente!")
  }else{
    const poll = await POLLS.findOne({ _id: choice?.pollId })
    const date = new Date(poll?.expireAt).getTime()
    if(Date.now() > date) return res.sendStatus(403)
  }

  await VOTES.insertOne({
    createdAt: `${date.getFullYear()}-${("0" + (date.getMonth() + 1)).slice(-2)}-${("0" + date.getDate()).slice(-2)} ${("0" + date.getHours()).slice(-2)}:${("0" + date.getMinutes()).slice(-2)}`,
    choiceId: objectId,
  });

  return res.sendStatus(201);
};
export const result = async (req, res) => {
  let maior = 0;
  let escolha = {};

  if (req.params.id.length != 24) return res.status(422).send("id invalido!");

  const objectID = new ObjectId(req.params.id);
  const choices = await CHOICES.find({ pollId: objectID }).toArray();
  const poll = await POLLS.findOne({ _id: objectID });

  if (choices.length === 0) return res.status(404).send("id inexistente!");

  for (let i = 0; i < choices.length; i++) {
    let votes = await VOTES.find({ choiceId: choices[i]?._id }).toArray();
    if (maior === 0) {
      maior = votes.length;
      escolha = choices[i];
    } else {
      if (votes.length === maior || votes.length > maior) {
        maior = votes.length;
        escolha = choices[i];
      }
    }
  }
  const result = {
    _id: poll._id,
    title: poll.title,
    expireAt: poll.expireAt,
    result: {
      title: escolha.title,
      votes: maior,
    },
  };

  return res.status(200).send(result);
};
