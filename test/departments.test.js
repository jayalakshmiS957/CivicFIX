process.env.NODE_ENV = 'test';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEPARTMENTS_DIRECTORY } from '../server/data/departmentsDirectory.js';
import { issuesRepo } from '../server/repositories/issuesRepo.js';
import departmentRoutes from '../server/routes/departmentRoutes.js';

describe('Municipal Departments Directory & Workload Endpoint Test Suite', () => {
  it('should return exactly 6 municipal departments in the directory', () => {
    assert.equal(DEPARTMENTS_DIRECTORY.length, 6, 'Must contain exactly 6 municipal departments');
    
    const deptNames = DEPARTMENTS_DIRECTORY.map((d) => d.name);
    assert.ok(deptNames.includes('Public Works Department'));
    assert.ok(deptNames.includes('Solid Waste Management'));
    assert.ok(deptNames.includes('Electricity Board / Street Lighting Division'));
    assert.ok(deptNames.includes('Water Supply & Drainage Board'));
    assert.ok(deptNames.includes('Municipal Safety & Enforcement'));
    assert.ok(deptNames.includes('General Administration'));
  });

  it('each department has valid municipal office details, Coimbatore zone, and fictional team', () => {
    for (const dept of DEPARTMENTS_DIRECTORY) {
      assert.ok(dept.id, `Department ${dept.name} must have an id`);
      assert.ok(dept.officeName, `Department ${dept.name} must have an officeName`);
      assert.ok(dept.address, `Department ${dept.name} must have an address`);
      assert.equal(
        dept.officeHours,
        'Mon-Sat 10:00 AM to 5:45 PM',
        `Department ${dept.name} office hours must match standard Mon-Sat 10:00 AM to 5:45 PM`
      );
      assert.match(dept.phone, /^0422-/, `Department ${dept.name} phone must start with 0422-`);
      
      // Head
      assert.ok(dept.head.name, `Department ${dept.name} must have head name`);
      assert.ok(dept.head.role, `Department ${dept.name} must have head role`);
      assert.ok(dept.head.zone, `Department ${dept.name} must have head zone`);
      assert.ok(dept.head.name.includes('(Fictional)'), 'Personnel must be flagged as fictional');

      // 3 Field Officers
      assert.equal(dept.officers.length, 3, `Department ${dept.name} must have exactly 3 field officers`);
      for (const officer of dept.officers) {
        assert.ok(officer.name, `Officer in ${dept.name} must have name`);
        assert.ok(officer.role, `Officer in ${dept.name} must have role`);
        assert.ok(officer.zone, `Officer in ${dept.name} must have zone`);
        assert.ok(officer.name.includes('(Fictional)'), 'Officer must be flagged as fictional');
      }
    }
  });

  it('GET /api/departments returns 6 departments and workload counts matching issues repository', async () => {
    // Execute route handler directly with mock req and res
    let responseData = null;
    let statusCode = 200;

    const mockReq = { query: {} };
    const mockRes = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      },
    };

    // Find the GET / handler from departmentRoutes
    const getLayer = departmentRoutes.stack.find((s) => s.route && s.route.methods.get);
    assert.ok(getLayer, 'Must have a GET route on departmentRoutes');
    
    await getLayer.route.stack[0].handle(mockReq, mockRes);

    assert.equal(statusCode, 200);
    assert.equal(responseData.success, true);
    assert.equal(responseData.count, 6);
    assert.equal(responseData.departments.length, 6);

    // Fetch all current issues from issuesRepo to cross-verify counts
    const allIssues = await issuesRepo.getAll();
    let computedTotalAcrossDepts = 0;

    for (const dept of responseData.departments) {
      const matchingIssues = allIssues.filter(
        (i) => i.department && i.department.toLowerCase() === dept.name.toLowerCase()
      );

      assert.equal(
        dept.workload.total,
        matchingIssues.length,
        `Total workload for ${dept.name} must match repository count`
      );

      const expectedOpen = matchingIssues.filter((i) => i.status === 'Reported').length;
      const expectedInProgress = matchingIssues.filter((i) => i.status === 'In Progress').length;
      const expectedResolved = matchingIssues.filter((i) => i.status === 'Resolved').length;

      assert.equal(dept.workload.open, expectedOpen, `Open count for ${dept.name} must match`);
      assert.equal(dept.workload.inProgress, expectedInProgress, `In progress count for ${dept.name} must match`);
      assert.equal(dept.workload.resolved, expectedResolved, `Resolved count for ${dept.name} must match`);

      // Current working on issues should contain all non-resolved issues
      const nonResolvedCount = matchingIssues.filter((i) => i.status !== 'Resolved').length;
      assert.equal(
        dept.currentIssues.length,
        nonResolvedCount,
        `Current working issues count for ${dept.name} must equal non-resolved issues count`
      );

      computedTotalAcrossDepts += dept.workload.total;
    }

    assert.equal(
      computedTotalAcrossDepts,
      allIssues.length,
      'Sum of department total workloads must match all issues'
    );
  });

  it('GET /api/departments?location=Gandhipuram filters counts and returns Gandhipuram ward data', async () => {
    let responseData = null;
    let statusCode = 200;

    const mockReq = { query: { location: 'Gandhipuram' } };
    const mockRes = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      },
    };

    const getLayer = departmentRoutes.stack.find((s) => s.route && s.route.methods.get);
    assert.ok(getLayer, 'Must have a GET route on departmentRoutes');

    await getLayer.route.stack[0].handle(mockReq, mockRes);

    assert.equal(statusCode, 200);
    assert.equal(responseData.success, true);
    assert.equal(responseData.location, 'Gandhipuram');
    assert.equal(responseData.departments.length, 6);

    const allIssues = await issuesRepo.getAll();
    const gandhipuramIssues = allIssues.filter((i) => {
      const loc = (i.location?.locality || '').toLowerCase();
      const addr = (i.location?.address || '').toLowerCase();
      return loc.includes('gandhipuram') || addr.includes('gandhipuram');
    });

    const sumFiltered = responseData.departments.reduce((acc, d) => acc + d.workload.total, 0);
    assert.equal(
      sumFiltered,
      gandhipuramIssues.length,
      'Total workload across departments must match count of Gandhipuram issues'
    );

    // Verify ward office and ward officers are returned for Gandhipuram
    for (const dept of responseData.departments) {
      assert.ok(dept.officeName.includes('Gandhipuram') || dept.address.includes('Gandhipuram'));
      assert.ok(dept.head.name.includes('(Fictional)'));
      assert.equal(dept.officers.length, 3);
    }
  });

  it('GET /api/departments?location=InvalidWard returns 400 Bad Request', async () => {
    let responseData = null;
    let statusCode = 200;

    const mockReq = { query: { location: 'InvalidWard' } };
    const mockRes = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      },
    };

    const getLayer = departmentRoutes.stack.find((s) => s.route && s.route.methods.get);
    assert.ok(getLayer, 'Must have a GET route on departmentRoutes');

    await getLayer.route.stack[0].handle(mockReq, mockRes);

    assert.equal(statusCode, 400);
    assert.equal(responseData.success, false);
    assert.match(responseData.error, /Invalid location/);
  });
});
