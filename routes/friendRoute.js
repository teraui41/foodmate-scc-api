const express = require("express");
const { friendModel } = require("../models");
const isEmpty = require("lodash/isEmpty");
const pick = require("lodash/pick");
const { approveFriendTransaction } = require("../helpers/transactions");
const { getConditionByQuery } = require("../helpers/utils");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { user } = req;
    const condition = getConditionByQuery(req.query);
    const friends = await friendModel.findFriends({
      status: { $ne: 0 },
      users: { $in: [user._id] },
      ...condition,
    });

    const result = friends.map(f => {
      const userItem = f.users.find(u => u.id !== user._id);
      const friendItem = pick(f, ['status', 'createAt', 'updateAt', 'creator']);
      return { ...userItem.toJSON(), ...friendItem };
    });

    return res.status(200).json({
      success: true,
      data: { friends: result },
    });
  } catch (error) {
    return res.status(200).json({
      success: true,
      data: { message: error.message },
    });
  }
});

router.post("/approve/:friendId", async (req, res) => {
  const { user } = req;
  const { friendId } = req.params;
  try {
    const result = await approveFriendTransaction(user._id, friendId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: { message: error.message },
    });
  }
});

router.post("/reject/:friendId", async (req, res) => {
  const { friendId } = req.params;
  try {
    console.log(1)
    const oldRecord = await friendModel.findFriendById(friendId);
    console.log("oldRecord", oldRecord)
    if (isEmpty(oldRecord) || oldRecord.status !== 1) {
      throw new Error("狀態錯誤");
    }
    console.log(2)
    oldRecord.status = 0;
    const result = await oldRecord.save();
    console.log(3)
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: { message: error.message },
    });
  }
});

router.post("/invite/:userId", async (req, res) => {
  const { userId } = req.params;
  const creatorString = req.user._id.toString();
  console.log("creatorString", creatorString)

  if (creatorString === userId) {
    return res.status(500).json({
      success: false,
      data: { message: "邀請者與被邀請者不可相同" },
    });
  }

  const users = [userId, creatorString];
  const oldRecord = await friendModel.findFriend({ users });
  console.log('oldRecord', oldRecord)

  if (isEmpty(oldRecord)) {
    const { id } = await friendModel.create({
      users,
      creator: creatorString,
      status: 1,
    });

    const friend = friendModel.findFriend({ _id: id });
    return res.status(200).json({
      success: true,
      data: friend,
    });
  }

  if (oldRecord.status === 0) {
    oldRecord.status = 1;
    oldRecord.creator = creatorString;
    const result = await oldRecord.save();

    return res.status(200).json({
      success: true,
      data: result,
    });
  }

  return res.status(500).json({
    success: false,
    data: { message: "狀態錯誤" },
  });
});

module.exports = router;
