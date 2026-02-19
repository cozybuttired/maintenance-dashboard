const { faker } = require('@faker-js/faker');

class MockService {
  constructor() {
    this.branches = ['PMB', 'PTA', 'QTN', 'CPT'];
    this.costCodes = [
      'MNT-001', 'MNT-002', 'MNT-003', 'MNT-004', 'MNT-005',
      'ELEC-001', 'ELEC-002', 'ELEC-003', 'ELEC-004', 'ELEC-005',
      'PLUMB-001', 'PLUMB-002', 'PLUMB-003', 'HVAC-001', 'HVAC-002',
      'FLOOR-001', 'FLOOR-002', 'FLOOR-003', 'ROOF-001', 'ROOF-002'
    ];
    
    this.maintenanceDescriptions = [
      'Preventive maintenance on HVAC system',
      'Electrical panel inspection and testing',
      'Plumbing pipe repair and replacement',
      'Floor tile replacement in production area',
      'Roof leak repair and sealing',
      'Generator testing and fuel system check',
      'Fire alarm system inspection',
      'Emergency lighting system testing',
      'Elevator maintenance and inspection',
      'Security system upgrade',
      'Compressed air system maintenance',
      'Boiler system inspection and cleaning',
      'Water treatment system service',
      'Electrical transformer maintenance',
      'Conveyor belt system repair',
      'Industrial door maintenance',
      'Office lighting upgrade',
      'Parking lot surface repair',
      'Building exterior painting',
      'Window and frame replacement',
      'Sprinkler system testing',
      'Gas line inspection and testing',
      'Backup power system testing',
      'Computer network cabling maintenance',
      'Industrial cleaning equipment service',
      'Waste management system maintenance',
      'Storm drain cleaning and repair',
      'Insulation replacement and upgrade',
      'Pest control service',
      'Landscaping and grounds maintenance'
    ];

    this.vendors = [
      'Truda Maintenance Services',
      'Eastern Cape Electricians',
      'Port Elizabeth Plumbing Co',
      'Gauteng HVAC Solutions',
      'Queenstown Industrial Repairs',
      'Cape Town Building Services',
      'National Fire Safety Ltd',
      'Southern Africa Elevator Co',
      'Industrial Floor Specialists',
      'Roofing Solutions SA',
      'Security Systems Africa',
      'Power Generation Services',
      'Water Treatment Experts',
      'Conveyor Belt Technicians',
      'Environmental Safety Services'
    ];
  }

  generateMockRecords(count = 50) {
    const records = [];
    
    for (let i = 1; i <= count; i++) {
      const date = faker.date.past({ years: 2, refDate: new Date() });
      const branch = faker.helpers.arrayElement(this.branches);
      const costCode = faker.helpers.arrayElement(this.costCodes);
      const description = faker.helpers.arrayElement(this.maintenanceDescriptions);
      const vendor = faker.helpers.arrayElement(this.vendors);
      
      // Generate realistic maintenance costs (R500 - R50,000)
      const amount = faker.number.float({ 
        min: 500, 
        max: 50000, 
        precision: 0.01 
      });

      // Generate work order number
      const workOrderNumber = `WO-${branch}-${date.getFullYear()}-${String(i).padStart(4, '0')}`;

      records.push({
        id: i,
        workOrderNumber,
        date: date.toISOString().split('T')[0], // YYYY-MM-DD format
        branch,
        costCode,
        description,
        vendor,
        amount,
        status: faker.helpers.arrayElement(['Completed', 'In Progress', 'Pending', 'Cancelled']),
        priority: faker.helpers.arrayElement(['Low', 'Medium', 'High', 'Critical']),
        requestedBy: faker.person.fullName(),
        approvedBy: faker.person.fullName(),
        completedDate: faker.datatype.boolean() ? 
          faker.date.between({ from: date, to: new Date() }).toISOString().split('T')[0] : null,
        invoiceNumber: faker.datatype.boolean() ? `INV-${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}` : null,
        paymentStatus: faker.helpers.arrayElement(['Paid', 'Pending', 'Overdue']),
        category: this.getCategoryFromCostCode(costCode),
        department: this.getDepartmentFromCostCode(costCode)
      });
    }

    return records.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  getCategoryFromCostCode(costCode) {
    if (costCode.startsWith('MNT')) return 'General Maintenance';
    if (costCode.startsWith('ELEC')) return 'Electrical';
    if (costCode.startsWith('PLUMB')) return 'Plumbing';
    if (costCode.startsWith('HVAC')) return 'HVAC';
    if (costCode.startsWith('FLOOR')) return 'Flooring';
    if (costCode.startsWith('ROOF')) return 'Roofing';
    return 'Other';
  }

  getDepartmentFromCostCode(costCode) {
    if (costCode.startsWith('MNT') || costCode.startsWith('FLOOR') || costCode.startsWith('ROOF')) {
      return 'Facilities';
    }
    if (costCode.startsWith('ELEC') || costCode.startsWith('HVAC')) {
      return 'Engineering';
    }
    if (costCode.startsWith('PLUMB')) {
      return 'Maintenance';
    }
    return 'General';
  }

  filterByUserPermissions(records, user) {
    if (user.role === 'ADMIN') {
      return records;
    }

    let filteredRecords = records;

    // Filter by branch
    if (user.branch && user.branch !== 'ALL') {
      filteredRecords = filteredRecords.filter(record => record.branch === user.branch);
    }

    // Filter by cost codes
    if (user.assignedCostCodes) {
      const allowedCostCodes = JSON.parse(user.assignedCostCodes);
      filteredRecords = filteredRecords.filter(record => 
        allowedCostCodes.includes(record.costCode)
      );
    }

    return filteredRecords;
  }

  getSummaryStats(records) {
    const totalAmount = records.reduce((sum, record) => sum + record.amount, 0);
    const completedRecords = records.filter(r => r.status === 'Completed');
    const pendingRecords = records.filter(r => r.status === 'In Progress' || r.status === 'Pending');
    const overdueRecords = records.filter(r => 
      r.status === 'In Progress' && 
      new Date(r.date) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    // Group by branch
    const branchStats = {};
    this.branches.forEach(branch => {
      const branchRecords = records.filter(r => r.branch === branch);
      branchStats[branch] = {
        count: branchRecords.length,
        totalCost: branchRecords.reduce((sum, r) => sum + r.amount, 0)
      };
    });

    // Group by category
    const categoryStats = {};
    records.forEach(record => {
      if (!categoryStats[record.category]) {
        categoryStats[record.category] = { count: 0, totalCost: 0 };
      }
      categoryStats[record.category].count++;
      categoryStats[record.category].totalCost += record.amount;
    });

    return {
      totalRecords: records.length,
      totalAmount,
      completedCount: completedRecords.length,
      pendingCount: pendingRecords.length,
      overdueCount: overdueRecords.length,
      completionRate: records.length > 0 ? (completedRecords.length / records.length * 100).toFixed(1) : 0,
      branchStats,
      categoryStats
    };
  }

  getMonthlyTrends(records, months = 12) {
    const trends = [];
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = monthDate.toISOString().slice(0, 7); // YYYY-MM format
      
      const monthRecords = records.filter(r => r.date.startsWith(monthKey));
      const monthTotal = monthRecords.reduce((sum, r) => sum + r.amount, 0);
      
      trends.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        year: monthDate.getFullYear(),
        monthNum: monthDate.getMonth() + 1,
        count: monthRecords.length,
        total: monthTotal,
        average: monthRecords.length > 0 ? monthTotal / monthRecords.length : 0
      });
    }
    
    return trends;
  }
}

module.exports = new MockService();