#!/usr/bin/env node
const parse = require('csv-parse/lib/sync');
const fs = require('fs');
const _ = require('underscore');
const knex = require('../libs/db').knex;
const constants = require('../models/constants');

function help() {
    console.log("\nImport camps data into the DB\n\nUsage:\n  bin/import_camps_data.js <camp_users_csv_file> <camps_csv_file> [--dry-run]\n")
}

function main(argv) {
    let users_file = argv[2];
    let camps_file = argv[3];
    let users_csv_data = fs.readFileSync(users_file);
    let camps_csv_data = fs.readFileSync(camps_file);

    // [{
    //      name: "", cell_phone: "", email: "", roles: ""
    // }...]
    let users_data = parse(users_csv_data, {columns: true});

    // [{
    //      camp_name_he: "", camp_name_en: "", camp_desc_he: "", camp_desc_en: "",
    //      status: "open" / null, facebook_page_url: "", accept_families: "FALSE" / "TRUE", email: ""
    // }...]
    let camps_data = parse(camps_csv_data, {columns: true});

    Promise.all(_(users_data).map(function(user) {
        let email = user.email.trim();
        if (!email) throw new Error();
        return knex(constants.USERS_TABLE_NAME).where({email: email}).count("*").then(function(res) {
            if (res[0]["count(*)"] > 0) {
                console.log("user already exists for email "+email+" - skipping inserting this user");
                return true;
            } else {
                return knex(constants.USERS_TABLE_NAME).insert({
                    name: user.name,
                    cell_phone: user.cell_phone,
                    email: user.email,
                    roles: user.roles
                }).then(function() {
                    console.log("inserted user: "+email);
                }).catch(function(err) {
                    console.log("error inserting user: "+email);
                    console.log(err);
                    process.exit();
                });
            }
        });
    })).then(function() {
        return Promise.all(_(camps_data).map(function (camp) {
            let email = camp.email.trim();
            return knex(constants.USERS_TABLE_NAME).where({email: email}).then(function(users) {
                if (users.length > 1) throw new Error();
                let user = (users.length === 1) ? users[0] : null;
                let user_id = user ? user["user_id"] : null;
                let camp_name_en = camp.camp_name_en;
                return knex(constants.CAMPS_TABLE_NAME).where({camp_name_en: camp_name_en}).count("*").then(function(res) {
                    if (res[0]["count(*)"] > 0) {
                        console.log("camp already exists for english camp name: "+camp_name_en+" - skipping inserting this camp");
                    } else {
                        return knex(constants.CAMPS_TABLE_NAME).insert({
                            camp_name_he: camp.camp_name_he,
                            camp_name_en: camp.camp_name_en,
                            camp_desc_he: camp.camp_desc_he,
                            camp_desc_en: camp.camp_desc_en,
                            status: camp.status,
                            facebook_page_url: camp.facebook_page_url,
                            accept_families: camp.accept_families
                        }).then(function() {
                            console.log("inserted camp: "+camp_name_en);
                        });
                    }
                }).then(function() {
                    return knex(constants.CAMPS_TABLE_NAME).where({camp_name_en: camp_name_en}).then(function(camps) {
                        if (camps.length !== 1) throw new Error();
                        let camp = camps[0];
                        let camp_id = camp.id;
                        return knex(constants.CAMPS_TABLE_NAME).where({camp_name_en: camp_name_en}).update({
                            main_contact: user_id,
                            contact_person_id: user_id
                        }).then(function(res) {
                            return knex(constants.USERS_TABLE_NAME).where({user_id: user_id}).update({
                                camp_id: camp_id
                            }).then(function() {
                                console.log("updated camp/users relations for camp "+camp_name_en);
                            });
                        });
                    });
                });
            });
        })).then(function () {
            console.log("Great Success!");
            process.exit();
        }).catch(function (err) {
            console.log("ERROR!");
            console.log(err);
            process.exit();
        });
    });

}

if (process.argv.length < 4) {
    help();
} else {
    main(process.argv);
}
