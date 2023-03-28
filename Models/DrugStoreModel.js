import mongoose from "mongoose";
const reviewSchema=mongoose.Schema({
    name: {
        type: String,
        require: true
    },
    rating: {
        type: Number,
        require: true,
    },
    comment: {
        type: String,
        require: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        require: true,
        ref: 'User'
    }
})

const drugStoreSchema=mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Product",
        },
        isActive: {
            type: Boolean,
            required: true,
            default: false,
        },

        stock: [
            {
                _id: false,
                lotNumber: {type: String, require: true},
                expDrug: {type: Date, require: true},
                count: {type: Number, require: true},
                priority: {type: Number, require: true, default: 0}
            }
        ],

        reviews: [reviewSchema],

        discount: {
            type: Number,
            required: true,
            default: 0.0,
        },
        discountDetail   : {
            type: Array,
            required: true,
            default: [],
        },
        refunded: {
            type: Number,
            required: true,
            default: 0.0,
        },

    },
    {
        timestamps: true,
    }
);

const DrugStore=mongoose.model("DrugStore",drugStoreSchema);

export default DrugStore;
