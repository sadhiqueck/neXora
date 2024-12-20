const express = require('express')
const router = express.Router();
const upload = require('../middleware/multer');
const { login, loadDashboard, loadUsers, deleteUser, blockUser, viewUser } = require("../controllers/adminController/adminController");
const { loadCategories, addCatgeory, deleteCategory, editCategory, } = require("../controllers/adminController/categoryController");
const { addProduct, loadProducts, deleteProduct, editProduct } = require('../controllers/adminController/productController')
const { authsession, isLogin } = require('../middleware/adminAuth')



router.get('/login', isLogin, (req, res) => {
    res.render('admin/login', { title: "Dashboard" })
})

router.get('/dashboard', authsession, loadDashboard)


router.post('/login', login)

router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        res.redirect('/admin/login?mssg="Logged out Succesfully')
    })

})

// user management
router.get('/users', authsession, loadUsers)
router.get('/delete-user/:id', authsession, deleteUser)
router.get('/block-user/:id', authsession, blockUser)
router.get('/view-user/:id', authsession, viewUser)

// catgeory management

router.get('/delete-category/:id', authsession, deleteCategory)
router.get('/category', authsession, loadCategories)
router.post('/add-category', addCatgeory)
router.post('/edit-category', authsession, editCategory)


// product Management
router.get('/products', authsession, loadProducts)
router.post('/add-product', upload.array('images', 4), addProduct)
router.post('/edit-product', upload.array('images', 4), editProduct)
router.get('/delete-product/:id', authsession, deleteProduct)


module.exports = router