'use strict';

const { db } = require('../config/firebase');
const { hashPassword } = require('./auth');

/**
 * Seed fake super admin for presentation
 */
async function seedSuperAdmin() {
    try {
        // Check if super admin already exists
        const companySnapshot = await db.collection('companies')
            .where('companyCode', '==', 'TECH2026')
            .get();

        if (!companySnapshot.empty) {
            console.log('Fake super admin already exists');
            return;
        }

        // Create company
        const companyRef = db.collection('companies').doc();
        const companyId = companyRef.id;

        await companyRef.set({
            name: 'TechCorp Solutions',
            companyCode: 'TECH2026',
            settings: {
                annualLeaveBalance: 20,
                sickLeaveBalance: 10,
                departments: ['IT', 'HR', 'Maintenance', 'Finance', 'Operations'],
                jobTitles: {
                    IT: ['Head of IT', 'IT Manager', 'Developer', 'System Administrator', 'IT Support'],
                    HR: ['Head of HR', 'HR Manager', 'HR Coordinator', 'Recruiter'],
                    Maintenance: ['Head of Maintenance', 'Maintenance Manager', 'Technician'],
                    Finance: ['Head of Finance', 'Finance Manager', 'Accountant', 'Financial Analyst'],
                    Operations: ['Head of Operations', 'Operations Manager', 'Coordinator']
                }
            },
            createdAt: new Date().toISOString()
        });

        // Create super admin user
        const hashedPassword = await hashPassword('Admin123!');
        const userRef = db.collection('users').doc();

        await userRef.set({
            email: 'admin@techcorp.com',
            password: hashedPassword,
            fullName: 'John Anderson',
            role: 'superadmin',
            jobTitle: 'Head of IT',
            department: 'IT',
            companyId: companyId,
            leaveBalance: {
                annual: 20,
                sick: 10
            },
            createdAt: new Date().toISOString()
        });

        console.log('✅ Fake super admin created successfully!');
        console.log('Company: TechCorp Solutions');
        console.log('Company Code: TECH2026');
        console.log('Email: admin@techcorp.com');
        console.log('Password: Admin123!');
    } catch (error) {
        console.error('Error seeding super admin:', error);
    }
}

module.exports = { seedSuperAdmin };
