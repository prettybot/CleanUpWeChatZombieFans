/**
 * 检测微信好友关系
 */

(() => {
    /**
     * 控件id
     */
    let ids;
    /**
     * 控件文本
     */
    let texts;
    let node_util;
    let db_util;
    /**
     * 悬浮窗
     */
    let window;
    /**
     * 好友的微信号
     */
    let last_we_chat_id;
    /**
     * 好友备注
     */
    let last_friend_remark;
    /**
     * 上一次点击的可见好友的位置
     */
    let last_index;
    /**
     * 执行步骤
     */
    let step;
    /**
     * 运行状态
     */
    let run;
    let language;
    let running_config;
    let log_util;

    /**
     * 点击通讯录
     */
    function clickContacts() {
        if (node_util.backtrackClickNode(id(ids["contacts"]).textMatches(texts["contacts"]).findOne())) {
            step = 1;
            log_util.info("点击通讯录成功");
        } else {
            log_util.warn("点击通讯录失败");
        }
    }

    /**
     * 滚动好友列表
     */
    function scrollFriendList() {
        let scrollResult = false;
        log_util.log("滚动ListView控件策略1");
        let node = id(ids["friend_list"]).findOnce();
        if (node) {
            if (node.bounds().right - node.bounds().left > 0) {
                scrollResult = node_util.scrollForward(node);
            } else {
                log_util.warn("ListView控件宽度为0");
            }
        } else {
            log_util.error("未找到ListView控件，控件id可能不一致");
        }
        if (!scrollResult) {
            log_util.log("滚动ListView控件策略2");
            let friend_remark_nodes = id(ids["friend_remark"]).untilFind();
            if (friend_remark_nodes.size() > 0) {
                let firstBounds = friend_remark_nodes.get(0).bounds();
                let lastBounds = friend_remark_nodes.get(friend_remark_nodes.size() - 1).bounds();
                scrollResult = swipe(lastBounds.centerX(), lastBounds.centerY(), firstBounds.centerX(), firstBounds.top, 500);
            }
        }
        // 最糟糕的情况，按1080x1920比例滑动屏幕
        if (!scrollResult) {
            log_util.log("滚动ListView控件策略3");
            setScreenMetrics(1080, 1920);
            scrollResult = swipe(540, 1658, 540, 428, 500);
        }
        if (scrollResult) {
            last_we_chat_id = "";
            last_friend_remark = "";
            last_index = 0;
            sleep(500);
            log_util.info("滚动ListView控件成功");
        } else {
            log_util.warn("滚动ListView控件失败");
        }
    }

    /**
     * 点击好友
     */
    function clickFriend() {
        let friend_remark_nodes = id(ids["friend_remark"]).untilFind();
        if (last_index >= friend_remark_nodes.size()) {
            if (id(ids["contacts_count"]).findOnce()) {
                stopScript();
            } else {
                scrollFriendList();
            }
        } else {
            let friend_remark_node = friend_remark_nodes.get(last_index);
            last_friend_remark = friend_remark_node.text();
            let repeat_friend_remark = (last_index > 0 && friend_remark_nodes.get(last_index - 1).text() == last_friend_remark) || (last_index < friend_remark_nodes.size() - 1 && friend_remark_nodes.get(last_index + 1).text() == last_friend_remark);
            if (repeat_friend_remark || !db_util.isTestedFriendForFriendRemark(last_friend_remark)) {
                let enabled = true;
                switch (running_config["test_friend_mode"]) {
                    // 白名单模式
                    case 0:
                        enabled = !db_util.isEnabledForLabelFriendByFriendRemark(last_friend_remark);
                        break;
                    // 黑名单模式
                    case 1:
                        enabled = db_util.isEnabledForLabelFriendByFriendRemark(last_friend_remark);
                        break;
                }
                if (enabled) {
                    if (node_util.backtrackClickNode(friend_remark_node)) {
                        step = 2;
                        last_index++;
                        log_util.info("点击联系人成功");
                    } else {
                        log_util.warn("点击联系人失败");
                    }
                } else {
                    last_index++;
                    log_util.verbose("忽略检测联系人");
                }
            } else {
                last_index++;
                log_util.verbose("联系人已检测");
            }
        }
    }

    /**
     * 点击发送信息
     */
    function clickSendMessage() {
        if (id(ids["more_function_by_delete"]).findOne(3000)) {
            let we_chat_id_node = id(ids["we_chat_id"]).findOne();
            let we_chat_id = we_chat_id_node.text();
            if (db_util.isTestedFriendForWeChatID(we_chat_id)) {
                log_util.verbose("联系人已检测");
                db_util.modifyTestedFriend({we_chat_id: we_chat_id, friend_remark: last_friend_remark});
                if (node_util.backtrackClickNode(id(ids["back_to_friend_list"]).findOne())) {
                    step = 1;
                    log_util.info("点击返回联系人列表页面成功");
                } else {
                    log_util.warn("点击返回联系人列表页面失败");
                }
            } else {
                while (true) {
                    let account_deleted_node = id(ids["account_deleted"]).textMatches(texts["account_deleted"]).findOnce();
                    if (account_deleted_node && node_util.backtrackClickNode(id(ids["back_to_friend_list"]).findOne())) {
                        db_util.addTestedFriend({we_chat_id: we_chat_id, friend_remark: last_friend_remark, abnormal_message: account_deleted_node.text(), selected: true, deleted: false, friend_type: db_util.ABNORMAL_FRIEND_TYPE});
                        step = 1;
                        break;
                    } else if (node_util.backtrackClickNode(id(ids["send_message"]).textMatches(texts["send_message"]).findOnce())) {
                        last_we_chat_id = we_chat_id;
                        step = 3;
                        break;
                    } else {
                        node_util.scrollForward(id(ids["friend_details_page_list"]).findOnce());
                    }
                }
            }
        } else {
            log_util.verbose("忽略检测联系人");
            if (node_util.backtrackClickNode(id(ids["back_to_friend_list"]).findOne())) {
                db_util.addTestedFriend({we_chat_id: last_friend_remark, friend_remark: last_friend_remark, abnormal_message: '', selected: false, deleted: false, friend_type: db_util.IGNORED_FRIEND_TYPE});
                step = 1;
                ui.run(() => {
                    window.ignored_friends_text.setText(window.ignored_friends_text.text() + last_friend_remark + "\n");
                    window.ignored_friends_text_scroll.scrollTo(0, window.ignored_friends_text.getHeight());
                });
                log_util.info("点击返回联系人列表页面成功");
            } else {
                log_util.warn("点击返回联系人列表页面失败");
            }
        }
    }

    /**
     * 切换到语音消息
     */
    function switchToVoiceMessage() {
        let node = id(ids["switch_message_type"]).findOne();
        if (!texts["switch_to_voice_message"].match(node.getContentDescription()) || node_util.backtrackClickNode(node)) {
            step = 4;
            log_util.info("点击切换消息类型成功");
        } else {
            log_util.warn("点击切换消息类型失败");
        }
    }

    /**
     * 点击更多功能
     */
    function clickMoreFunction() {
        if (node_util.backtrackClickNode(id(ids["more_function_by_transfer"]).findOne())) {
            step = 5;
            log_util.info("点击更多功能成功");
        } else {
            log_util.warn("点击更多功能失败");
        }
    }

    /**
     * 点击转账功能
     */
    function clickTransferFunction() {
        if (node_util.backtrackClickNode(id(ids["transfer_function"]).textMatches(texts["transfer"]).findOne())) {
            step = 6;
            log_util.info("点击转账功能成功");
        } else {
            log_util.warn("点击转账功能失败");
        }
    }

    /**
     * 输入转账金额
     */
    function setTransferAmount() {
        let payee = id(ids["payee"]).findOne().text();
        if (/.?\(.+\)/.test(payee) && payee != last_friend_remark) {
            db_util.addTestedFriend({we_chat_id: last_we_chat_id, friend_remark: last_friend_remark, abnormal_message: '', selected: false, deleted: false, friend_type: db_util.NORMAL_FRIEND_TYPE});
            step = 9;
            log_util.verbose("正常联系人");
        } else if (id(ids["transfer_amount"]).findOne().setText("0.01")) {
            step = 7;
        }
    }

    /**
     * 点击确认转账
     */
    function clickConfirmTransfer() {
        if (node_util.backtrackClickNode(id(ids["confirm_transfer"]).enabled().findOne())) {
            step = 8;
            log_util.info("点击转账成功");
        } else {
            log_util.warn("点击转账失败");
        }
    }

    /**
     * 判断好友关系
     */
    function assertionFriend() {
        while (true) {
            // 正常支付
            let close_transfer_password_node = descMatches(texts["close"]).findOnce() || descMatches(texts["return"]).findOnce();
            if (close_transfer_password_node && !close_transfer_password_node.getViewIdResourceName() && node_util.backtrackClickNode(close_transfer_password_node)) {
                db_util.addTestedFriend({we_chat_id: last_we_chat_id, friend_remark: last_friend_remark, abnormal_message: '', selected: false, deleted: false, friend_type: db_util.NORMAL_FRIEND_TYPE});
                step = 9;
                break;
            }
            // 取消支付
            let cancel_transfer_node = descMatches(texts["cancel_transfer"]).findOnce();
            if (cancel_transfer_node && !cancel_transfer_node.getViewIdResourceName() && node_util.backtrackClickNode(cancel_transfer_node)) {
                db_util.addTestedFriend({we_chat_id: last_friend_remark, friend_remark: last_friend_remark, abnormal_message: '', selected: false, deleted: false, friend_type: db_util.IGNORED_FRIEND_TYPE});
                ui.run(() => {
                    window.ignored_friends_text.setText(window.ignored_friends_text.text() + last_friend_remark + "\n");
                    window.ignored_friends_text_scroll.scrollTo(0, window.ignored_friends_text.getHeight());
                });
                step = 9;
                break;
            }
            let abnormal_message_node = id(ids["abnormal_message"]).findOnce();
            let abnormal_message = abnormal_message_node && abnormal_message_node.text();
            if (abnormal_message && node_util.backtrackClickNode(id(ids["confirm_abnormal_message"]).findOne())) {
                if (texts["network_error"].match(abnormal_message) || texts["system_error"].match(abnormal_message)) {
                    // 其他异常
                    db_util.addTestedFriend({we_chat_id: last_friend_remark, friend_remark: last_friend_remark, abnormal_message: '', selected: false, deleted: false, friend_type: db_util.IGNORED_FRIEND_TYPE});
                    ui.run(() => {
                        window.ignored_friends_text.setText(window.ignored_friends_text.text() + last_friend_remark + "\n");
                        window.ignored_friends_text_scroll.scrollTo(0, window.ignored_friends_text.getHeight());
                    });
                } else {
                    let selected = !!(texts["blacklisted_message"].match(abnormal_message) || texts["deleted_message"].match(abnormal_message));
                    db_util.addTestedFriend({we_chat_id: last_we_chat_id, friend_remark: last_friend_remark, abnormal_message: abnormal_message, selected: selected, deleted: false, friend_type: db_util.ABNORMAL_FRIEND_TYPE});
                }
                step = 9;
                break;
            }
        }
    }

    function backToChatList() {
        while (true) {
            // 返回聊天页面
            if (node_util.backtrackClickNode(id(ids["back_to_chat"]).findOnce())) {
            }
            // 返回聊天列表
            if (node_util.backtrackClickNode(id(ids["back_to_chats"]).findOnce())) {
                step = 0;
                break;
            }
        }
        log_util.log("----------------------------------------");
    }

    /**
     * 监听音量下键按下，停止脚本运行
     */
    function keyDownListenerByVolumeDown() {
        threads.start(function () {
            // 启用按键监听
            events.observeKey();
            events.setKeyInterceptionEnabled("volume_down", true);
            // 监听减音量键按下
            events.onceKeyDown("volume_down", function () {
                stopScript();
            });
        });
    }

    /**
     * 停止脚本运行
     */
    function stopScript() {
        run = false;
        db_util.deleteIgnoredTestFriend();
        events.setKeyInterceptionEnabled("volume_down", false);
        events.removeAllKeyDownListeners("volume_down");
        ui.run(() => window.close());
        toastLog(language["script_stopped"]);
        engines.execScriptFile("main.js");
        engines.myEngine().forceStop();
    }

    function main() {
        node_util = require("utils/node_util.js");
        db_util = require("utils/db_util.js");
        log_util = require("utils/log_util.js");
        let app_util = require("utils/app_util.js");
        
        ids = app_util.getWeChatIds();
        texts = JSON.parse(files.read("config/text_id/text.json"));

        last_we_chat_id = "", last_friend_remark = "", last_index = 0, step = 0, run = true;
        keyDownListenerByVolumeDown();
        
        language = app_util.getLanguage();
        running_config = app_util.getRunningConfig();

        toastLog(language["script_running"]);
        
        window = floaty.window(
            <vertical padding="8" bg="#000000">
                <text textColor="#FFCC00" id="ignored_friends_title"/>
                <scroll h="100" layout_weight="1" id="ignored_friends_text_scroll"><text textColor="#FFCC00" layout_gravity="top" id="ignored_friends_text"/></scroll>
                <button id="stop_button" textColor="green" style="Widget.AppCompat.Button.Colored" textStyle="bold"/>
            </vertical>
        );
        ui.run(() => {
            window.ignored_friends_title.setText(language["ignored_friends_title"]);
            window.stop_button.setText(language["stop"]);
            window.setAdjustEnabled(true);
            window.stop_button.on("click", (view) => {
                view.setEnabled(false);
                stopScript();
            });
        });

        launch(app_util.getConfig()["we_chat_package_name"]);
        while (run) {
            switch (step) {
                case 0:
                    clickContacts();
                    break;
                case 1:
                    clickFriend();
                    break;
                case 2:
                    clickSendMessage();
                    break;
                case 3:
                    switchToVoiceMessage();
                    break;
                case 4:
                    clickMoreFunction();
                    break;
                case 5:
                    clickTransferFunction();
                    break;
                case 6:
                    setTransferAmount();
                    break;
                case 7:
                    clickConfirmTransfer();
                    break;
                case 8:
                    assertionFriend();
                    break;
                case 9:
                    backToChatList();
                    break;
            }
        }
    }

    main();
})();