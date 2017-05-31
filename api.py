import configparser
import argparse
from urllib import request
import html
import json
import csv
from datetime import datetime
from dateutil.relativedelta import relativedelta


def main():
    global api_key, verbose, state_to_fips

    config = configparser.ConfigParser()
    config.read('api.cfg')
    api_key = config['ProPublica API']['api_key']

    state_to_fips = {}
    with open('data/fips_codes.csv', 'r') as f:
        reader = csv.reader(f)
        for row in reader:
            state = row[1]
            fips_code = row[0]
            state_to_fips[state] = fips_code

    parser = argparse.ArgumentParser(
        description='Hit up the ProPublica Congress API for some data')
    parser.add_argument('chamber', metavar='CHAMBER', type=str,
        help='choose data for the House or for the Senate')
    parser.add_argument('search', metavar='SEARCH', type=str,
        choices=['members', 'committees', 'nominees'],
        help='type of search: members, committees, or nominees')
    parser.add_argument('--verbose', action='store_true',
        help='verbose: log progress as results are gathered')

    args = parser.parse_args()
    chamber = args.chamber
    search = args.search
    verbose = args.verbose

    if search == 'members':
        out = get_members(chamber)
    elif search == 'committees':
        out = get_committee_memberships(chamber)
    else:
        out = get_nominees()

    with open('data/{0}-{1}.json'.format(chamber, search), 'w') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)


def api_call(query):
    base_url = 'https://api.propublica.org/congress/v1/'
    url = base_url + query

    headers = {'X-API-KEY': api_key}

    req = request.Request(url, headers=headers)
    res = request.urlopen(req)

    json_response = json.loads(html.unescape(res.read().decode('utf-8')))

    try:
        the_real_json = json_response['results'][0]
    except KeyError:
        return
    return the_real_json


def get_members(chamber):
    out = {}
    query = '115/{0}/members.json'.format(chamber)
    results = api_call(query)
    members = results['members']
    for member in members:
        info = {}
        member_id = member['id']
        member_query = 'members/{0}.json'.format(member_id)
        member_results = api_call(member_query)
        role = member_results['roles'][0]
        committees = []
        for committee in role['committees']:
            committees.append(committee['code'])
        info['id'] = member_id
        info['name'] = build_name(member_results['first_name'],
            member_results['middle_name'], member_results['last_name'])
        info['age'] = calculate_age(member_results['date_of_birth'])
        info['gender'] = member_results['gender']
        info['party'] = member_results['current_party'][0]
        info['state'] = member['state']
        info['website'] = member_results['url']
        info['twitter'] = member_results['twitter_account']
        info['seniority'] = int(role['seniority'])
        info['bills_sponsored'] = int(role['bills_sponsored'])
        info['bills_cosponsored'] = int(role['bills_cosponsored'])
        try:
            info['missed_votes_pct'] = float(role['missed_votes_pct'])
            info['votes_with_party_pct'] = float(role['votes_with_party_pct'])
        except ValueError:
            info['missed_votes_pct'] = -100.0
            info['votes_with_party_pct'] = -100.0
        info['committees'] = committees
        if chamber == 'house':
            info['district'] = member['district']
            district_id = build_district_id(info['state'], info['district'])
            out[district_id] = info
        elif chamber == 'senate':
            state = info['state']
            try:
                other_sen = out[state+'a']
                out[state+'b'] = info
            except KeyError:
                out[state+'a'] = info
    return out


def get_committee_memberships(chamber):
    out = []
    fieldnames = ['member_id']
    membership = {}
    query = '115/{0}/committees.json'.format(chamber)
    results = api_call(query)
    committees = results['committees']
    for committee in committees:
        if verbose:
            print(committee['name'])
        com_id = committee['id']
        fieldnames.append(com_id)
        com_query = '115/{0}/committees/{1}.json'.format(chamber, com_id)
        com_results = api_call(com_query)
        if com_results == None:
            continue
        members = com_results['current_members']
        for member in members:
            member_id = member['id']
            try:
                membership[member_id][com_id] = 1
            except KeyError:
                membership[member_id] = {'member_id': member_id}
                membership[member_id][com_id] = 1
    out.append(fieldnames)
    out.append(membership)
    return out


def get_nominees():
    query = '115/nominees/received.json'
    results = api_call(query)


def build_name(first, middle, last):
    name = first
    if middle:
        name += ' ' + middle
    name += ' ' + last
    if verbose:
        print(name)
    return name


def calculate_age(dob):
    birth_date = datetime.strptime(dob, '%Y-%m-%d')
    now = datetime.now()
    age = relativedelta(now, birth_date).years
    return age


def build_district_id(state, district):
    one_district_states = ['AK', 'DE', 'MT', 'ND', 'SD', 'VT', 'WY',
        'AS', 'GU', 'MP', 'PR', 'UM', 'VI']
    state_fips = state_to_fips[state]
    if state_fips[0] == '0':
        state_fips = state_fips[1]
    if state in one_district_states:
        distid = state_fips + '00'
    elif state == 'DC':
        distid = '1198'
    elif len(district) == 1:
        distid = state_fips + '0' + district
    else:
        distid = state_fips + district
    return distid


if __name__ == "__main__":
    main()
