import React, { useState, useEffect, useRef } from 'react';
import { Badge, Checkbox, Result, Spin, Upload, message, Layout, Steps, Menu, PageHeader, Row, Col, Form, Input, Button, Divider } from 'antd';
import { InboxOutlined, UploadOutlined, CrownOutlined, EditOutlined, FileZipOutlined, CheckCircleOutlined, LinkOutlined } from '@ant-design/icons';
import { enquireScreen } from 'enquire-js';
import moment from 'moment';
import 'antd/dist/antd.css';
import './App.css';
import logo from './logo.svg';
const { Step } = Steps;
const { Dragger } = Upload;
const { Header, Content, Footer } = Layout;
const axios = require('axios').default;

let _isMobile;
enquireScreen((b) => {
  _isMobile = b;
});
function App(props) {
  const [isMobile, setIsMobile] = useState(_isMobile);
  const [formData, setFormData] = useState();
  const [data, setData] = useState({});
  const [current, setCurrent] = useState(0);
  const uploadUrlRef = useRef();
  useEffect(() => {
    enquireScreen((b) => {
      setIsMobile(!!b);
    });
    axios.get("/api/homework/info?key=" + window.location.href.split('/')[3]).then((res) => {
      setFormData(res.data);
      if (!res.data.success) {
        message.error(res.data.errorMessage);
        console.error(res.data.errorMessage);
      }
    }).catch((err) => {
      console.error(err);
      message.error(err.message);
      setFormData(false);
    });
  }, [props.location]);

  return (
    <Layout>
      <Header className="header">
        <div className="logo">
          <Badge count={"BETA"} color="#00bfff" size={"small"} style={{ top: "12px", left: "15px", right: "-20px" }} >
            <img src={logo} alt="logo" width="100%" />
          </Badge>
        </div>
        <Menu selectedKeys={["home"]} mode="horizontal" theme="light" >
          <Menu.Item key="home" icon={<UploadOutlined />}>
            作业提交
          </Menu.Item>
          <Menu.Item key="blog" icon={<LinkOutlined />}>
            <a href="https://xjzsq.cn" target="_blank" rel="noopener noreferrer">
              青い記憶
            </a>
          </Menu.Item>
          <Menu.Item key="admin" icon={<CrownOutlined />}>
            <a href="/admin/" rel="noopener noreferrer">
              管理后台
            </a>
          </Menu.Item>
        </Menu>
      </Header>
      <Content>
        {formData ? formData.success ?
          <Row>
            <Col span={18} offset={3}>
              <PageHeader title={formData.data.homeworkName} subTitle={`截止时间：${moment(formData.data.deadline).format('YYYY-MM-DD HH:mm:ss')}`}>
                <Steps direction={isMobile ? "vertical" : "horizontal"} >
                  {formData.data.steps.map((step, index) =>
                    <Step
                      key={'step-' + index}
                      status={current > index ? 'finish' : current < index ? 'wait' : 'process'}
                      title={step.title}
                      icon={step.type === 'info' ?
                        <EditOutlined /> :
                        <FileZipOutlined />}>
                    </Step>
                  )}
                  <Step
                    key={'step-' + formData.data.steps.length}
                    status={current < formData.data.steps.length ? 'wait' : 'process'}
                    title={'完成~'}
                    icon={<CheckCircleOutlined />}>
                  </Step>
                </Steps>
              </PageHeader>
              <Divider />
              {formData.data.steps.map((step, index) => {
                if (current === index) {
                  if (step.type === 'info') {
                    return (
                      <Form
                        key={'form-' + index}
                        style={{ paddingTop: isMobile ? 0 : '30px' }}
                        labelCol={{ span: isMobile ? 24 : 8 }}
                        wrapperCol={{ span: isMobile ? 24 : 8 }}
                        name={index}
                        onFinish={
                          (values) => {
                            let remember = values['remember'];
                            delete values['remember'];
                            axios.post("/api/homework/submit", { id: formData.id, key: window.location.href.split('/')[3], current, data: { data: values } }).then((res) => {
                              if (remember) {
                                for (let key in values) {
                                  localStorage.setItem(key, values[key]);
                                }
                              }
                              setData(data => ({ ...data, ...values }));
                              setCurrent(current + 1);
                            }).catch((err) => {
                              console.error(err);
                              message.error("提交失败，请检查网络后重试，错误信息：", err.message);
                            });
                          }
                        }
                      >
                        {step.info.map((info) =>
                          <Form.Item
                            labelCol={{ span: isMobile ? 24 : 9 }}
                            wrapperCol={{ span: isMobile ? 24 : 6 }}
                            key={'form-' + index + '-info-' + info.name}
                            label={info.name}
                            name={info.name}
                            rules={[
                              {
                                required: true,
                                message: '输入' + info.name + '...',
                              },
                            ]}
                            initialValue={localStorage.getItem(info.name)}
                          >
                            <Input />
                          </Form.Item>
                        )}
                        <Form.Item {...tailLayout} name="remember" valuePropName="checked" key={'form-' + index + '-remember'} initialValue={true}>
                          <Checkbox>记住信息</Checkbox>
                        </Form.Item>
                        <Form.Item key={'form-' + index + '-info-next'} {...tailLayout}>
                          <Button type="primary" htmlType="submit" >
                            下一步
                          </Button>
                        </Form.Item>
                      </Form>
                    );
                  } else if (step.type === 'upload') {
                    return (
                      <Dragger
                        key={'dragger-' + index}
                        name={step.name}
                        action={() => {
                          return uploadUrlRef.current;
                        }}
                        method="PUT"
                        multiple={false}
                        beforeUpload={
                          async file => {
                            let ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
                            if (step.ext.indexOf(ext) === -1) {
                              message.error(`${file.name} 不是一个 ${step.ext.join('/')} 文件！`, 3);
                              return Upload.LIST_IGNORE;
                            }
                            let name = step.filename.map((item) => data[item.content] || item.content).join('');
                            const p = new Promise((resolve, reject) => {
                              axios.post('/api/homework/submit', { id: formData.id, key: window.location.href.split('/')[3], current, data: { name: step.title + '/' + name + ext } }).then((res) => {
                                uploadUrlRef.current = res.data.url;
                                resolve(res.data.url);
                              }).catch((err) => {
                                message.error(err.message);
                                console.error(err);
                                reject(err);
                              });
                            });
                            return p;
                          }
                        }
                        onChange={
                          (info) => {
                            const { status } = info.file;
                            if (status === 'done') {
                              setCurrent(current + 1);
                            }
                          }
                        }
                      >
                        <p className="ant-upload-drag-icon">
                          <InboxOutlined />
                        </p>
                        <p className="ant-upload-text">
                          {step.text}
                        </p>
                        <p className="ant-upload-hint">
                          {step.hint}
                        </p>
                      </Dragger>
                    );
                  }
                  return <Button type='primary' onClick={() => { setCurrent(current + 1) }}>下一步</Button>;
                }
                return <></>
              })}
              {current === formData.data.steps.length && (
                <Result
                  status="success"
                  title="提交成功！"
                  subTitle="如需重新提交请刷新页面重新提交"
                  size="large"
                />
              )}
            </Col>
          </Row>
          :
          <Result
            status={formData.errorStatus || "404"}
            title={formData.errorCode || "404"}
            subTitle={formData.errorMessage || "未知错误"}
          />
          :
          formData === undefined ?
            <div className="loading">
              <Spin />
            </div>
            :
            <Result
              status="500"
              title="500"
              subTitle="服务器错误，请联系管理员（或许你可以试试刷新一下）"
            />
        }
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        作业提交系统  @2022 Crafted with ❤ by <a href="http://d1.fan" target="_blank" rel="noreferrer">xjzsq </a>,
        Powered by <a href="https://reactjs.org/" target="_blank" rel="noreferrer"> React </a >
      </Footer >
    </Layout >
  );
}

export default App;
const tailLayout = {
  wrapperCol: {
    offset: 9,
    span: 16,
  },
};
