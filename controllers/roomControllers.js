import Room from '../models/Room';
import Booking from '../models/Booking';
import ErrorHandler from '../utils/erorHandler';
import catchAsyncErrors from '../middlewares/catchAsyncErrors';
import APIFeatures from '../utils/apiFeatures';
import cloudinary from 'cloudinary';

// @method          GET
// @path            /api/rooms
// @description     Create new room
const allRooms = catchAsyncErrors(async (req, res) => {
	const resPerPage = 4;

	const roomsCount = await Room.countDocuments();

	const apiFeatures = new APIFeatures(Room.find(), req.query)
		.search()
		.filter()
		.pagination(resPerPage);

	let rooms = await apiFeatures.query;
	let filteredRoomsCount = rooms.length;

	res
		.status(200)
		.json({ success: true, roomsCount, resPerPage, filteredRoomsCount, rooms });
});

// @method          POST
// @path            /api/rooms
// @description     Create new room
const newRoom = catchAsyncErrors(async (req, res) => {
	let { images } = req.body;
	let imagesLink = [];
	for (let i = 0; i < images.length; i++) {
		const imgResult = await cloudinary.v2.uploader.upload(images[i], {
			folder: 'bookIt/rooms',
		});

		imagesLink.push({
			public_id: imgResult.public_id,
			url: imgResult.secure_url,
		});
	}
	req.body.images = imagesLink;
	req.body.user = req.user._id;
	const room = await Room.create(req.body);
	res.status(200).json({ success: true, room });
});

// @method          GET
// @path            /api/rooms/:id
// @description     Get room by Id
const getSingleRoom = catchAsyncErrors(async (req, res, next) => {
	const { id } = req.query;
	const room = await Room.findById(id);
	if (!room) return next(new ErrorHandler('Room not found with this id', 404));
	res.status(200).json({ success: true, room });
});

// @method          PUT
// @path            /api/rooms/:id
// @description     Update room by Id
const updateRoom = catchAsyncErrors(async (req, res, next) => {
	const { id } = req.query;
	let { images } = req.body;

	let room = await Room.findById(id);
	if (!room) return next(new ErrorHandler('Room not found with this id', 404));

	if (req.body.images) {
		for (let i = 0; i < room.images.length; i++) {
			await cloudinary.v2.uploader.destroy(room.images[i].public_id);
		}
		let imagesLink = [];
		for (let i = 0; i < images.length; i++) {
			const imgResult = await cloudinary.v2.uploader.upload(images[i], {
				folder: 'bookIt/rooms',
			});

			imagesLink.push({
				public_id: imgResult.public_id,
				url: imgResult.secure_url,
			});
		}
		req.body.images = imagesLink;
	}

	room = await Room.findByIdAndUpdate(id, req.body, {
		new: true,
		runValidators: true,
		useFindAndModify: false,
	});
	res.status(200).json({ success: true, room });
});

// @method          DELETE
// @path            /api/rooms/:id
// @description     Delete room by Id
const deleteRoom = catchAsyncErrors(async (req, res, next) => {
	const { id } = req.query;
	let room = await Room.findById(id);
	if (!room) return next(new ErrorHandler('Room not found with this id', 404));

	for (let i = 0; i < room.images.length; i++) {
		await cloudinary.v2.uploader.destroy(room.images[i].public_id);
	}
	room = await Room.findByIdAndRemove(id);
	res.status(200).json({ success: true, room });
});

// @method          PUT
// @path            /api/reviews
// @description     Create room reivew

const createRoomReview = catchAsyncErrors(async (req, res) => {
	const { rating, comment, roomId } = req.body;

	const review = {
		user: req.user._id,
		name: req.user.name,
		rating: Number(rating),
		comment,
	};

	const room = await Room.findById({ _id: roomId });

	const isReviewed = room.reviews.find(
		(rev) => rev.user.toString() === req.user._id.toString()
	);

	if (isReviewed) {
		room.reviews.forEach((review) => {
			if (review.user.toString() === req.user._id.toString()) {
				review.comment = comment;
				review.rating = rating;
			}
		});
	} else {
		room.reviews.push(review);
		room.numOfReviews = room.reviews.length;
	}

	room.ratings = room.reviews.reduce(
		(acc, item) => (item.rating + acc, 0) / room.reviews.length
	);

	await room.save({ validateBeforeSave: false });

	res.status(200).json({ success: true });
});

// @method          GET
// @path            /api/reviews/check_review_availability
// @description     Check Review Availability

const checkReviewAvailability = catchAsyncErrors(async (req, res) => {
	const { roomId } = req.query;

	const bookings = await Booking.find({ user: req.user._id, room: roomId });

	let isReviewAvailable = false;

	if (bookings && bookings.length > 0) isReviewAvailable = true;

	res.status(200).json({ success: true, isReviewAvailable });
});

// @method          GET
// @path            /api/reviews/
// @description     Get room reviews

const getRoomReviews = catchAsyncErrors(async (req, res) => {
	const room = await Room.findById(req.query.id);
	console.log('room', room);
	res.status(200).json({
		success: true,
		reviews: room.reviews,
	});
});

// @method          GET
// @path            /api/admin/rooms
// @description     Get All Rooms - ADMIN

const allAdminRooms = catchAsyncErrors(async (req, res) => {
	const rooms = await Room.find();
	res.status(200).json({
		success: true,
		rooms,
	});
});

// @method          DELETE
// @path            /api/reviews/
// @description     Get All Rooms - ADMIN

const deleteReview = catchAsyncErrors(async (req, res) => {
	const room = await Room.findById(req.query.roomId);

	const reviews = room.reviews.filter(
		(review) => review._id.toString() !== req.query.id.toString()
	);

	const numOfReviews = reviews.length;

	const ratings =
		room.reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length;

	await Room.findByIdAndUpdate(
		req.query.roomId,
		{
			reviews,
			ratings,
			numOfReviews,
		},
		{
			new: true,
			runValidators: true,
			useFindAndModify: false,
		}
	);

	res.status(200).json({
		success: true,
	});
});

export {
	allRooms,
	newRoom,
	getSingleRoom,
	updateRoom,
	deleteRoom,
	createRoomReview,
	checkReviewAvailability,
	getRoomReviews,
	deleteReview,
	allAdminRooms,
};
