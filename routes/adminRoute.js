const express = require('express')
const router = express.Router();
const cloudinary = require('../config/cloudinaryConfig');
const upload = require('../config/multerConfig');

// controllers
const { login, loadLogin, loadDashboard, loadUsers, deleteUser, blockUser, viewUser, logout } = require("../controllers/adminController/adminController");
const { loadCategories, addCatgeory, deleteCategory, editCategory, } = require("../controllers/adminController/categoryController");
const { addProduct, loadProducts, deleteProduct, editProduct, loadAddProductpage, loadEditProductpage } = require('../controllers/adminController/productController')
const { loadOrders, updateOrder, updateProductStatus, cancelAll, ChangeDeliveryDate } = require('../controllers/adminController/orderController')

// middlewares
const { authsession, isLogin } = require('../middleware/adminAuth')




router.get('/login', isLogin, loadLogin)

router.get('/dashboard', authsession, loadDashboard)


router.post('/login', login)

router.post('/logout', authsession, logout)

// user management
router.get('/users', authsession, loadUsers)
router.get('/delete-user/:id', authsession, deleteUser)
router.get('/block-user/:id', authsession, blockUser)
router.get('/view-user/:id', authsession, viewUser)

// catgeory management

router.get('/delete-category/:id', authsession, deleteCategory)
router.get('/category', authsession, loadCategories)
router.post('/add-category', authsession, addCatgeory)
router.post('/edit-category', authsession, editCategory)


// product Management
router.get('/products', authsession, loadProducts)
router.post('/add-product', authsession,upload.array('images', 4), addProduct)
router.post('/edit-product', authsession,upload.array('images', 4), editProduct)
router.get('/delete-product/:id', authsession, deleteProduct)
router.get('/add-products', loadAddProductpage)
router.get('/edit-products', loadEditProductpage)


// ordermanagement

router.get('/orders', authsession, loadOrders)
router.get('/order-update/:orderId', authsession, updateOrder);
router.post('/orders/update-product-status', authsession, updateProductStatus)
router.post('/orders/cancel-all', authsession, cancelAll)
router.post('/orders/date-change', authsession, ChangeDeliveryDate)


module.exports = router