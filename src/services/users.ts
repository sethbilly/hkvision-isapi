import { getClient } from './devices.js';

export interface UserInput {
  employeeNo: string;
  name: string;
  userType?: 'normal' | 'visitor' | 'blackList';
  beginTime?: string;
  endTime?: string;
  doorNo?: number;
  planTemplateNo?: string;
  gender?: 'male' | 'female' | 'unknown';
}

export async function addUser(deviceId: string, input: UserInput) {
  const client = getClient(deviceId);
  return client.request({
    method: 'POST',
    path: '/ISAPI/AccessControl/UserInfo/Record',
    json: {
      UserInfo: {
        employeeNo: input.employeeNo,
        name: input.name,
        userType: input.userType ?? 'normal',
        gender: input.gender ?? 'unknown',
        Valid: {
          enable: true,
          beginTime: input.beginTime ?? '2020-01-01T00:00:00',
          endTime: input.endTime ?? '2035-12-31T23:59:59',
          timeType: 'local',
        },
        doorRight: String(input.doorNo ?? 1),
        RightPlan: [
          { doorNo: input.doorNo ?? 1, planTemplateNo: input.planTemplateNo ?? '1' },
        ],
      },
    },
  });
}

export async function updateUser(
  deviceId: string,
  input: Partial<UserInput> & { employeeNo: string },
) {
  const client = getClient(deviceId);
  const body: any = { UserInfo: { employeeNo: input.employeeNo } };
  if (input.name !== undefined) body.UserInfo.name = input.name;
  if (input.userType !== undefined) body.UserInfo.userType = input.userType;
  if (input.gender !== undefined) body.UserInfo.gender = input.gender;
  if (input.beginTime || input.endTime) {
    body.UserInfo.Valid = {
      enable: true,
      beginTime: input.beginTime ?? '2020-01-01T00:00:00',
      endTime: input.endTime ?? '2035-12-31T23:59:59',
      timeType: 'local',
    };
  }
  return client.request({
    method: 'PUT',
    path: '/ISAPI/AccessControl/UserInfo/Modify',
    json: body,
  });
}

export async function deleteUser(deviceId: string, employeeNo: string) {
  const client = getClient(deviceId);
  return client.request({
    method: 'PUT',
    path: '/ISAPI/AccessControl/UserInfo/Delete',
    json: { UserInfoDelCond: { EmployeeNoList: [{ employeeNo }] } },
  });
}

export async function deleteAllUsers(deviceId: string) {
  const client = getClient(deviceId);
  return client.request({
    method: 'PUT',
    path: '/ISAPI/AccessControl/UserInfo/Delete',
    json: { UserInfoDelCond: {} },
  });
}

export async function searchUsers(
  deviceId: string,
  opts: { offset?: number; limit?: number; employeeNo?: string } = {},
) {
  const client = getClient(deviceId);
  const cond: any = {
    searchID: `usr-${Date.now()}`,
    searchResultPosition: opts.offset ?? 0,
    maxResults: opts.limit ?? 30,
  };
  if (opts.employeeNo) cond.EmployeeNoList = [{ employeeNo: opts.employeeNo }];
  return client.request({
    method: 'POST',
    path: '/ISAPI/AccessControl/UserInfo/Search',
    json: { UserInfoSearchCond: cond },
  });
}

export async function countUsers(deviceId: string) {
  const client = getClient(deviceId);
  return client.request({ method: 'GET', path: '/ISAPI/AccessControl/UserInfo/Count' });
}
