const adminSchema = require('../../models/adminModel');
const bcrypt = require('bcrypt');
const Users = require("../../models/userModel");
const categoryDB = require('../../models/categoryModel')


const loadCategories = async (req, res) => {
    try {
        if (req.session.admin) {

            const {sort = '', search = '' } = req.query;
            const page = parseInt(req.query.page) || 1;
            const limit = 5;
            const skip = (page - 1) * limit;

            let query = {};

            if (search) {
                query.$or = [
                    { categoryName: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ];
            }
            switch (sort) {
                case 'active':
                    query.isDeleted = false;
                    break;
                case 'deleted':
                    query.isDeleted = true;
                    break;

            }


            let sortQuery = {};
            switch (sort) {
                case 'newest':
                    sortQuery = { createdAt: -1 };
                    break;
                case 'oldest':
                    sortQuery = { createdAt: 1 };
                    break;
                case 'name_asc':
                    sortQuery = { name: 1 };
                    break;
                case 'name_desc':
                    sortQuery = { name: -1 };
                    break;
                default:
                    sortQuery = { createdAt: -1 };
            }

            const totalCategory = await categoryDB.countDocuments(query);
            const categories = await categoryDB.find(query).sort(sortQuery).skip(skip).limit(limit).lean();
            const totalPages = Math.ceil(totalCategory / limit);
            const startIndex = (page - 1) * limit + 1;
            const endIndex = Math.min(page * limit, totalCategory)

            res.render("admin/category_manage", { categories, 
                title:"Category Management",
                sort,
                searchQuery: search,
                pagination:{
                    currentPage: page,
                    totalCategory,
                    totalPages,
                    startIndex,
                    endIndex,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
             })
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