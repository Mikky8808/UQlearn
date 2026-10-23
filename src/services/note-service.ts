import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';

export interface Note {
    id?: string;
    userId: string;
    lessonId: string;
    timestamp: number;
    content: string;
    createdAt: string;
}

export const noteService = {
    async saveNote(userId: string, lessonId: string, timestamp: number, content: string): Promise<Note> {
        const noteData: Omit<Note, 'id'> = {
            userId,
            lessonId,
            timestamp,
            content,
            createdAt: new Date().toISOString()
        };
        const docRef = await addDoc(collection(db, 'notes'), noteData);
        return { id: docRef.id, ...noteData };
    },
    async getNotes(userId: string, lessonId: string): Promise<Note[]> {
        const q = query(
            collection(db, 'notes'),
            where('userId', '==', userId),
            where('lessonId', '==', lessonId),
            orderBy('timestamp', 'asc')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note));
    }
};
