import express from 'express'
import {  getConversation, getConversations, postMessage, createConversation } from '../controllers/conversations.js'
const Auth = require('../Authentication/is-auth');

const router = express.Router();

router.get('/chat', Auth.authentication, getConversations);
router.get('/chat/:id', Auth.authentication, getConversation);
router.patch('/chat/message/:id', Auth.authentication, postMessage);
router.post('/chat/conversation', Auth.authentication, createConversation);

export default router;