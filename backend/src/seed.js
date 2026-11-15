const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');

dotenv.config();

const categoriesData = [
  { name: 'Electronics', description: 'Everyday tech, audio and smart devices' },
  { name: 'Clothing', description: 'Comfortable apparel, footwear and accessories' },
  { name: 'Books', description: 'Fiction, learning and creative inspiration' },
  { name: 'Home & Kitchen', description: 'Thoughtful upgrades for your home' },
  { name: 'Sports', description: 'Gear for training, fitness and the outdoors' },
];

const demoProducts = [
  { name: 'Studio Wireless Headphones', category: 'Electronics', price: 89.99, brand: 'Soundline', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85', description: 'Comfort-fit wireless headphones with rich, balanced sound and all-day battery life.' },
  { name: 'Everyday Smartphone', category: 'Electronics', price: 549.00, brand: 'Northstar', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=85', description: 'A bright, responsive smartphone for photos, work and everything in between.' },
  { name: 'Minimal Smart Watch', category: 'Electronics', price: 129.50, brand: 'Tempo', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85', description: 'Track daily activity and notifications from a clean, lightweight watch.' },
  { name: 'Mirrorless Travel Camera', category: 'Electronics', price: 699.00, brand: 'Focus Works', image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=85', description: 'A compact camera made for crisp travel photos and creative everyday shooting.' },
  { name: 'Classic Cotton T-Shirt', category: 'Clothing', price: 24.00, brand: 'Common Thread', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85', description: 'A soft, breathable cotton tee with a versatile regular fit.' },
  { name: 'Utility Denim Jacket', category: 'Clothing', price: 74.00, brand: 'Field & Form', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=85', description: 'A durable, easy-layer denim jacket with a timeless silhouette.' },
  { name: 'Everyday Running Shoes', category: 'Clothing', price: 95.00, brand: 'Stride', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85', description: 'Lightweight trainers with cushioned support for your daily miles.' },
  { name: 'Canvas Weekend Backpack', category: 'Clothing', price: 58.00, brand: 'Roam', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85', description: 'A roomy canvas backpack with a padded sleeve and handy organizer pockets.' },
  { name: 'The Creative Habit', category: 'Books', price: 18.99, brand: 'Bright Pages', image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=900&q=85', description: 'An inviting guide to building a creative practice, one small step at a time.' },
  { name: 'Wilderness Field Guide', category: 'Books', price: 22.50, brand: 'Open Trail Press', image: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=900&q=85', description: 'A pocket-friendly reference for curious hikers and nature lovers.' },
  { name: 'Modern Home Cooking', category: 'Books', price: 32.00, brand: 'Table & Type', image: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=900&q=85', description: 'Approachable recipes and practical techniques for everyday meals.' },
  { name: 'Sketchbook for Ideas', category: 'Books', price: 14.00, brand: 'Paper House', image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=85', description: 'A sturdy, lay-flat sketchbook for notes, plans and first drafts.' },
  { name: 'Handmade Ceramic Mug', category: 'Home & Kitchen', price: 28.00, brand: 'Clay Day', image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=85', description: 'A glazed ceramic mug with a comfortable handle and a warm, handmade feel.' },
  { name: 'Arc Table Lamp', category: 'Home & Kitchen', price: 64.00, brand: 'Softlight', image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85', description: 'A compact accent lamp that brings a soft pool of light to a desk or side table.' },
  { name: 'Indoor Green Plant', category: 'Home & Kitchen', price: 36.00, brand: 'Little Leaf', image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=900&q=85', description: 'An easy-care leafy plant to add a fresh touch to your room.' },
  { name: 'Cast Iron Skillet', category: 'Home & Kitchen', price: 49.00, brand: 'Hearthstone', image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=900&q=85', description: 'A versatile cast iron pan for searing, roasting and slow Sunday breakfasts.' },
  { name: 'Studio Yoga Mat', category: 'Sports', price: 39.00, brand: 'Grounded', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=900&q=85', description: 'A grippy, supportive mat for stretching, yoga and home workouts.' },
  { name: 'Training Dumbbell Set', category: 'Sports', price: 54.00, brand: 'Rep Club', image: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=900&q=85', description: 'A compact strength-training set for building a simple home routine.' },
  { name: 'Match Day Football', category: 'Sports', price: 29.00, brand: 'Kickabout', image: 'https://images.unsplash.com/photo-1614632537190-23e4146777db?auto=format&fit=crop&w=900&q=85', description: 'A durable, all-weather football for practice and weekend games.' },
  { name: 'Court Tennis Racket', category: 'Sports', price: 79.00, brand: 'Baseline', image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=900&q=85', description: 'A balanced racket designed for confident rallies and comfortable control.' },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const categories = await Promise.all(categoriesData.map((category) =>
      Category.findOneAndUpdate(
        { name: category.name },
        { $set: category },
        { new: true, upsert: true }
      )
    ));
    const categoriesByName = new Map(categories.map((category) => [category.name, category._id]));

    await Promise.all(demoProducts.map(async (product, index) => {
      const sku = `DEMO-${String(index + 1).padStart(3, '0')}`;
      const existing = await Product.findOne({ $or: [{ sku }, { name: `Product ${index + 1}` }] });
      const values = {
        sku,
        name: product.name,
        description: product.description,
        price: product.price,
        image: product.image,
        brand: product.brand,
        category: categoriesByName.get(product.category),
      };
      if (existing) {
        Object.assign(existing, values);
        await existing.save();
      } else {
        await Product.create({ ...values, countInStock: 20 });
      }
    }));

    const demoUsers = [
      { name: 'Admin User', email: 'admin@example.com', password: 'Admin123!', role: 'admin' },
      { name: 'Demo Customer', email: 'user@example.com', password: 'User123!', role: 'customer' },
    ];
    for (const user of demoUsers) {
      if (!await User.exists({ email: user.email })) await User.create(user);
    }

    console.log(`Seed complete: ${categories.length} categories, ${demoProducts.length} catalog products with images, demo accounts created if missing.`);
    await mongoose.disconnect();
  } catch (error) {
    console.error('Seed error:', error);
    await mongoose.disconnect().catch(() => {});
    process.exitCode = 1;
  }
};

seed();
