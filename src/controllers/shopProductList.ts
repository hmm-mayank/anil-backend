import Axios from "axios";
import { Types } from "mongoose";
import { Request, Response, NextFunction } from "express";
import { infoLog, errorLog } from "../util/loggerInfo";
import { ShopProductsList } from "../models/ShopProductListModel";
import { SERVER_IP } from "../util/secrets";

/**
 * @description | Add ShopProductsList with Image, Name & slug
 * @param req 
 * @param res 
 */
export const addShopProductsList = async (req: Request = null, res: Response = null) => {

    const shopProductsList = new ShopProductsList({
        ...req.body
    });
    infoLog("addShopProductsList", [req.body, req.query]);
    shopProductsList.save((err, doc) => {
        if (err) {
            errorLog("addShopProductsList", err, req.method);
            res.status(500).jsonp({ message: "Field Validation Failed !!", error: err });
        }
        else {
            infoLog("addShopProductsList => RESPONSE SUCCESS", [req.body, req.query, doc]);
            res.status(200).jsonp({ message: doc });
        }

    });
};

/**
 * Pass _id to delete the element
 * @param req | 
 * @param res 
 */
export const deleteShopProductsList = async (req: Request = null, res: Response = null, next: NextFunction) => {
    infoLog("deleteShopProductsList", [req.body, req.query]);
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) {

        return res.status(500).jsonp({ message: "Body is Not Defined" });
    }
    try {
        const doc = await ShopProductsList.deleteOne({ ...req.body });
        if (doc.deletedCount > 0) {
            infoLog("deleteShopProductsList => SUCCESS", [req.body, req.query, doc]);
            res.status(200).jsonp({ message: "Item Deleted Successfully", data: doc });
            next();
        }
        else {
            infoLog("deleteShopProductsList => NO RECORD FOUND", [req.body, req.query, doc]);
            res.status(204).jsonp({ message: "Item Not Found !!", data: doc });
        }
    }
    catch (error) {
        errorLog("deleteShopProductsList => PARAMETER ERROR", error, req.body);
        return res.status(500).jsonp({ mssage: "Please check parameter/s", error });
    }


};

/**
 * Pass _id to as KEY
 * @param req | any Body Parameter which wants to get updated 
 * @param res |
 */
export const updateShopProductsList = async (req: Request = null, res: Response = null) => {
    infoLog("updateShopProductsList", [req.body, req.query]);
    ShopProductsList.findOneAndUpdate({ ...req.query }, { $addToSet: { products: req.body.products } }, (err: object) => {
        if (err) {
            errorLog("deleteShopProductsList => UPDATE FAILED ", err, req.method);
            return res.status(500).json({ message: "Something went Wrong" });
        }

    }).then((doc: object) => {
        if (!doc) {
            infoLog("updateShopProductsList", [req.body, req.query, doc]);
            return res.status(204).json({ message: "Requested Element Not Found !!", item: doc });
        }
        else {
            infoLog("updateShopProductsList", [req.body, req.query, doc]);
            return res.status(200).json({ message: "Updated Successfuly!!", item: doc });
        }

    });
};

export const getShopProductsList = async (req: Request = null, res: Response = null) => {
    infoLog("getShopProductsList", [req.body, req.query]);
    const pageOptions = {
        page: parseInt(req.body.page, 10) || 0,
        limit: parseInt(req.body.limit, 10) || 10
    };

    ShopProductsList.find()
        .skip(pageOptions.page * pageOptions.limit)
        .limit(pageOptions.limit)
        .exec((err, doc) => {
            if (err) {
                errorLog("getShopProductsList => GET FAILED ", err, req.method);
                return res.status(500).jsonp({ "messge": "Something Went Wrong !!", error: err });
            }
            else {
                infoLog("getShopProductsList ==> SUCCESS", [req.body, req.query]);
                res.status(200).jsonp(doc[0]);
            }
        });
};

export const getNamedShopProductsList = async (req: Request = null, res: Response = null) => {
    infoLog("getNamedShopProductsList", [req.body, req.query]);

    const pageOptions = {
        page: parseInt(req.body.page, 10) || 0,
        limit: parseInt(req.body.limit, 10) || 10
    };
    if (req.query._id) {
        const { _id } = req.query as { _id: string };
        const allProjection = [
            { $match: { _id: Types.ObjectId(_id) } },
            { $unwind: "$products" },
            { $group: { _id: "$_id", products: { $push: "$products" } } }
        ];
        const catProjection = [
            { $match: { _id: Types.ObjectId(_id) } },
            { $unwind: "$products" },
            { $match: { "products.cIds": req.query["products.cIds"] } },
            { $group: { _id: "$_id", products: { $push: "$products" } } }
        ];

        // taking out Product id from the array
        ShopProductsList.
            aggregate(req.query["products.cIds"] ? catProjection : allProjection)
            // find({ ...req.query }, req.query["products.cIds"] && projection)
            // .skip(pageOptions.page * pageOptions.limit)
            // .limit(pageOptions.limit)
            .exec(async (err, doc) => {
                console.log(err, "GET DATA ERRO");
                console.log(doc, "GET DATA");
                if (err || doc.length == 0) {
                    errorLog("getNamedShopProductsList => GET FAILED ", err, req.method);
                    return res.status(500).jsonp({ "messge": [], error: "Something Went Wrong !!", suggestion: "Please try with storeProductListId" });
                }
                else {

                    const productList: object[] = [];

                    infoLog("getNamedShopProductsList ==> SUCCESS", [req.body, req.query]);

                    if (doc[0]["products"].length > 0) {
                        let tempIds = "";
                        for (let i = 0, len = doc[0]["products"].length; i < len; i++) {

                            tempIds = tempIds + `${tempIds ? "," : ""}` + doc[0]["products"][i].pId;

                        }



                        console.log(tempIds, "GET PIDS ");
                        const elementLength = doc[0]["products"].length;
                        console.log("GETPROUCSLENGTH", doc[0]["products"].length);
                        console.log(doc[0]["products"], "asdfghjklkjhgfdsa");
                        const data = await Axios("http://localhost:3001/api/product/many?ids=" + tempIds);

                        let merged = [];
                        let reponseData = data.data.data;
                        for (let i = 0; i < doc[0]["products"].length; i++) {
                            merged.push({
                                ...doc[0]["products"][i],
                                ...(reponseData.find((itmInner: any) => itmInner._id === doc[0]["products"][i].pId))
                            }
                            );
                        }
                        // let arr3 = arr1.map((item, i) => Object.assign({}, item, arr2[i]));
                        res.status(200).jsonp({ products: merged, length: elementLength });
                    }

                    else res.status(500).jsonp({ products: [], message: "No Product Found" });

                }
            });

    }
    else {
        res.status(500).jsonp({ message: "Please check Shop ID", error: "shopId not Found" });
    }


};