const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { authenticateToken, isAdmin } = require('../middlewares/authMiddleware');

router.get('/', roomController.getAllRooms);
router.post('/', authenticateToken, isAdmin, roomController.createRoom);
router.put('/:id', authenticateToken, isAdmin, roomController.updateRoom);
router.delete('/:id', authenticateToken, isAdmin, roomController.deleteRoom);

module.exports = router;