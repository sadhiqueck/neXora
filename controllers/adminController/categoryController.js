const adminSchema = require('../../models/adminModel');
const bcrypt = require('bcrypt');
const Users = require("../../models/userModel");
const categoryDB = require('../../models/categoryModel')


const loadCategories = async (req, res) => {
    try {
        if (req.session.admin) {
            const categories = await categoryDB.find({})
            res.render("admin/category_manage", { categories, title:"Category Management" })
        }
        else {
            return res.redirect('/admin/login')
        }

    } catch (error) {
        console.log(error);
    }
}

const addCatgeory = async (req, res) => {
    try {
        const { categoryName, description } = req.body;

        const newCategory = new categoryDB({
            categoryName,
            description,
        })

        await newCategory.save()
        res.redirect('/admin/category')

    } catch (error) {

        console.log(error);

    }
}

const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;


        const category = await categoryDB.findById(id);

        // Toggle the `isDeleted` status
        category.isDeleted = !category.isDeleted;

        await category.save();
        res.redirect('/admin/category');

    } catch (error) {
        console.error(error);
        res.status(500).send('Something went wrong');
    }
}

const editCategory = async (req, res) => {
    try {

        const { id, categoryName, description } = req.body;

        const category = await categoryDB.findOneAndUpdate({ _id: id }, { $set: { categoryName, description } })
        res.redirect('/admin/category')

    } catch (error) {

        console.log(error);
    }
}
module.exports = {
    loadCategories,
    addCatgeory,
    deleteCategory,
    editCategory
}