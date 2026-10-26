require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Project = require('../models/Project');
const Module = require('../models/Module');
const logger = require('../utils/logger');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB for seeding');

    // Create admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@internflow.com';
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      const admin = await User.create({
        name: process.env.ADMIN_NAME || 'System Admin',
        email: adminEmail,
        password: process.env.ADMIN_PASSWORD || 'Admin@123456',
        role: 'admin',
        department: 'Administration',
      });
      logger.info(`Admin created: ${admin.email}`);
    } else {
      logger.info('Admin already exists, skipping.');
    }

    // Create demo mentor
    const mentorEmail = 'mentor@internflow.com';
    let mentor = await User.findOne({ email: mentorEmail });
    if (!mentor) {
      mentor = await User.create({
        name: 'Demo Mentor',
        email: mentorEmail,
        password: 'Mentor@123456',
        role: 'mentor',
        department: 'Engineering',
        phone: '+91-9876543210',
      });
      logger.info(`Demo mentor created: ${mentor.email}`);
    }

    // Create demo intern
    const internEmail = 'intern@internflow.com';
    let intern = await User.findOne({ email: internEmail });
    if (!intern) {
      intern = await User.create({
        name: 'Demo Intern',
        email: internEmail,
        password: 'Intern@123456',
        role: 'intern',
        department: 'Engineering',
        assignedMentor: mentor._id,
      });
      // Add intern to mentor's list
      await User.findByIdAndUpdate(mentor._id, { $addToSet: { assignedInterns: intern._id } });
      logger.info(`Demo intern created: ${intern.email}`);
    }

    // Create demo project
    let project = await Project.findOne({ name: 'InternFlow Demo Project' });
    if (!project) {
      const admin = await User.findOne({ role: 'admin' });
      project = await Project.create({
        name: 'InternFlow Demo Project',
        description: 'A demonstration project for the InternFlow AI platform.',
        techStack: ['React', 'Node.js', 'MongoDB'],
        status: 'active',
        createdBy: admin._id,
      });
      logger.info(`Demo project created: ${project.name}`);

      // Create demo modules
      await Module.create([
        { name: 'User Authentication Module', description: 'Login, register, JWT', project: project._id, order: 1, createdBy: admin._id },
        { name: 'Dashboard Module', description: 'Role-based dashboards', project: project._id, order: 2, createdBy: admin._id },
        { name: 'Task Management Module', description: 'CRUD for tasks', project: project._id, order: 3, createdBy: admin._id },
      ]);
      logger.info('Demo modules created');
    }

    logger.info('\n====== SEED COMPLETE ======');
    logger.info('Demo credentials:');
    logger.info(`  Admin:  admin@internflow.com / Admin@123456`);
    logger.info(`  Mentor: mentor@internflow.com / Mentor@123456`);
    logger.info(`  Intern: intern@internflow.com / Intern@123456`);
    logger.info('===========================\n');

    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();
