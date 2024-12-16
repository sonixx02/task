const User = require('../models/User');
const XLSX = require('xlsx');
const multer = require('multer');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');


exports.getUsers = async (req, res) => {
  try {
    const users = await User.find(); 

    
    if (!users || users.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }

    
    users.forEach(user => {
      if (!user._id) {
        console.error(`User with missing ID: ${user}`);
      }
    });

    res.status(200).json(users); 
  } catch (error) {
    console.error('Error fetching users:', error); 
    res.status(500).json({ message: 'Server error while fetching users', error: error.message });
  }
};



exports.addUser = async (req, res) => {
  try {
    const { name, email, mobileNo, password } = req.body;

    if (!email || !mobileNo || !password) {
      return res
        .status(400)
        .json({ message: 'Name, Email, Mobile Number, and Password are required.' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { mobileNo }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Email or Mobile Number already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      mobileNo,
      password: hashedPassword,
    });

    await newUser.save();
    res.status(201).json({ message: 'User added successfully', user: newUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while adding user' });
  }
};


exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const user = await User.findByIdAndUpdate(id, updates, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while updating user' });
  }
};


exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while deleting user' });
  }
};


exports.exportUsers = async (req, res) => {
  try {
    const users = await User.find({}, 'name email mobileNo');
    const usersData = users.map((user) => ({
      Name: user.name,
      Email: user.email,
      'Mobile Number': user.mobileNo,
    }));

    const worksheet = XLSX.utils.json_to_sheet(usersData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.status(200).send(buffer);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Server error while exporting users' });
  }
};


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `import-${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /xlsx|xls|csv/;
    const isFileTypeValid =
      allowedTypes.test(path.extname(file.originalname).toLowerCase()) &&
      allowedTypes.test(file.mimetype);

    if (isFileTypeValid) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel files are allowed.'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Import Users from Excel
exports.importUsers = [
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const filePath = req.file.path;
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);

      let importedCount = 0;
      let skippedCount = 0;

      for (const user of data) {
        const { name, email, mobileNo, password } = user;

        if (!name || !email || !mobileNo || !password) {
          skippedCount++;
          continue; // Skip invalid rows
        }

        const existingUser = await User.findOne({ $or: [{ email }, { mobileNo }] });
        if (!existingUser) {
          const hashedPassword = await bcrypt.hash(password.toString(), 10);
          await User.create({ name, email, mobileNo, password: hashedPassword });
          importedCount++;
        } else {
          skippedCount++;
        }
      }

      fs.unlinkSync(filePath); 

      res.status(200).json({
        message: 'Users imported successfully',
        importedCount,
        skippedCount,
      });
    } catch (error) {
      console.error('Import error:', error);
      res.status(500).json({ message: 'Server error while importing users' });
    }
  },
];


exports.blockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.status(200).json({
      message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`,
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while blocking/unblocking user' });
  }
};
