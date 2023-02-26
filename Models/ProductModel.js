import mongoose from 'mongoose'
// const reviewSchema = mongoose.Schema({
//     name:{
//         type: String,
//         require: true   
//     },
//     rating:{
//         type: Number,
//         require: true,
//     },
//     comment:{
//         type: String,
//         require: true   
//     },
//     user:{
//         type: mongoose.Schema.Types.ObjectId,
//         require: true,
//         ref: 'User'
//     }
// })
const productSchema = mongoose.Schema({
    name:{
        type: String,
        require: true   
    },
    regisId:{
        type: String,
        require: true
    },
    category:{
        type: mongoose.Schema.Types.ObjectId,
        require: true,
        ref: 'Category'
    },
    categoryDrug:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CategoryDrug'
    },
    unit: { // đơn vị tính
        type: String,
        require: true
    },
    packing: { // quy cách đóng gói
        type: String,
        require: true
    },
    APIs:[ //active pharmaceutical ingredient (hoạt chất dược)
        {
            _id: false,
            API: { type: String, required: true },
            content: { type: Number, required: true },
        }
    ],
    branchName: { // tên biệt dược
        type: String,
    },
    manufacturer:{ // nhà sản xuất
        type: String,
        require: true
    },
    countryOfOrigin:{ // nước sản xuất
        type: String,
        require: true
    },
    instruction:{ // lời dặn
        type: String,
        require: true
    },
    price:{
        type: Number,
        require: true,
        default: 0
    },
    allowToSell:{ // cho phép bán 
        type: Boolean,
        default: true
    },
    prescription:{
        type: Boolean, // thuốc kê đơn
        default: true
    },
    description:{
        type: String,
        require: true
    },
    image:{
        type: String,
        require: true,
    },
    // rating:{
    //     type: Number,
    //     require: true,
    //     default: 0
    // },
    // numberReviews:{
    //     type: Number,
    //     require: true,
    //     default: 0
    // },
    // reviews: [reviewSchema]

},{
    timestamps: true
}
)
const Product = mongoose.model("Product", productSchema)
export default Product