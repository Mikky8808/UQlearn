import { Router, Request, Response } from 'express';

export interface MessageReply {
  id: string;
  senderName: string;
  senderRole: string;
  content: string;
  timestamp: string;
}

export interface MessageThread {
  id: string;
  courseId?: string;
  courseTitle?: string;
  lessonTitle?: string;
  learnerName: string;
  learnerAvatar?: string;
  lastMessage: string;
  unread: boolean;
  timestamp: string;
  replies: MessageReply[];
}

let messages: MessageThread[] = [];

const router = Router();

// GET all Q&A threads & messages
router.get('/', (req: Request, res: Response) => {
  res.json(messages);
});

// POST reply to a thread
router.post('/reply', (req: Request, res: Response) => {
  const { messageId, reply }: { messageId: string; reply: Partial<MessageReply> } = req.body;

  const msg = messages.find(m => m.id === messageId);
  if (!msg) {
    return res.status(404).json({ error: 'Message thread not found' });
  }

  const newReply: MessageReply = {
    id: `rep-${Date.now()}`,
    senderName: reply.senderName || 'Instructor',
    senderRole: reply.senderRole || 'Instructor',
    content: reply.content || '',
    timestamp: 'Just now'
  };

  msg.replies.push(newReply);
  msg.lastMessage = newReply.content;
  msg.timestamp = 'Just now';
  msg.unread = false;

  res.json({ success: true, thread: msg });
});

// POST create new question thread
router.post('/thread', (req: Request, res: Response) => {
  const { learnerName, courseTitle, lessonTitle, question } = req.body;

  const newThread: MessageThread = {
    id: `msg-${Date.now()}`,
    learnerName: learnerName || 'Learner',
    learnerAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80',
    courseTitle: courseTitle || 'UQlearn Course',
    lessonTitle: lessonTitle || 'General Discussion',
    lastMessage: question || 'New question posted',
    unread: true,
    timestamp: 'Just now',
    replies: [
      {
        id: `r-${Date.now()}`,
        senderName: learnerName || 'Learner',
        senderRole: 'Learner',
        content: question || '',
        timestamp: 'Just now'
      }
    ]
  };

  messages.unshift(newThread);
  res.status(201).json(newThread);
});

export default router;
