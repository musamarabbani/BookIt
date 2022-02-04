import nc from 'next-connect';
import {
	allRooms,
	getSingleRoom,
	newRoom,
} from '../../../controllers/roomControllers';
import dbConnect from '../../../config/dbConnect';

const handler = nc();
dbConnect();

handler.get(allRooms);
handler.get(getSingleRoom);
handler.post(newRoom);

export default handler;
